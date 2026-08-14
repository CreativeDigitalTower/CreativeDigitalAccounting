import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { canAllocate } from "@/lib/logistics/purchaseCalc";
import { z } from "zod";

const schema = z.object({ shipmentId: z.string(), force: z.boolean().optional() });

// Приспадане на курс от проформа. Нетото на курса се приспада автоматично. Ако
// остатъкът би станал отрицателен → изисква явно потвърждение (force). Един курс се
// приспада от най-много една проформа (unique shipmentId).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const { shipmentId, force } = schema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const proforma = await tx.logisticsProforma.findFirst({
        where: { id, companyId: g.companyId },
        select: { id: true, initialQuantity: true, allocations: { select: { quantity: true, shipmentId: true } } },
      });
      if (!proforma) return { status: 404 as const, body: { error: "Проформата не е намерена." } };

      const shipment = await tx.shipment.findFirst({ where: { id: shipmentId, companyId: g.companyId, deletedAt: null }, select: { id: true, netQuantity: true, code: true } });
      if (!shipment) return { status: 404 as const, body: { error: "Курсът не е намерен." } };
      if (shipment.netQuantity == null || !(shipment.netQuantity > 0)) return { status: 400 as const, body: { error: "Курсът няма нето количество." } };

      const existing = await tx.proformaAllocation.findUnique({ where: { shipmentId }, select: { proformaId: true } });
      if (existing) return { status: 409 as const, body: { error: existing.proformaId === id ? "Курсът вече е приспаднат от тази проформа." : "Курсът вече е приспаднат от друга проформа." } };

      const chk = canAllocate(proforma.initialQuantity, proforma.allocations.map((a) => a.quantity), shipment.netQuantity);
      if (!chk.ok && !force) {
        return { status: 409 as const, body: { needsConfirm: true, error: "Остатъкът ще стане отрицателен.", remainingAfter: chk.remainingAfter } };
      }
      await tx.proformaAllocation.create({ data: { proformaId: id, shipmentId, quantity: shipment.netQuantity, createdById: g.userId } });
      return { status: 200 as const, body: { ok: true, remainingAfter: chk.remainingAfter, code: shipment.code } };
    });

    if (result.status === 200) await audit(g.companyId, g.userId, "allocate", "LogisticsProforma", id, `Приспадане на курс ${(result.body as { code?: string }).code ?? shipmentId}`);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Курсът вече е приспаднат." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Премахване на приспадане.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  const { id } = await params;
  const shipmentId = new URL(req.url).searchParams.get("shipmentId");
  if (!shipmentId) return NextResponse.json({ error: "Липсва shipmentId." }, { status: 400 });
  const alloc = await prisma.proformaAllocation.findFirst({ where: { proformaId: id, shipmentId, proforma: { companyId: g.companyId } }, select: { id: true } });
  if (!alloc) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
  await prisma.proformaAllocation.delete({ where: { id: alloc.id } });
  await audit(g.companyId, g.userId, "deallocate", "LogisticsProforma", id, `Премахнато приспадане ${shipmentId}`);
  return NextResponse.json({ ok: true });
}
