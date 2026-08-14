import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { isValidShipmentStatus } from "@/lib/logistics/config";
import { z } from "zod";

const schema = z.object({ status: z.string(), note: z.string().max(1000).nullable().optional() });

// Смяна на статус на курс + запис в историята (одит: от→към, кой, кога).
// Реалният статус се променя само с потребителско действие (без авто-преходи).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json());
    if (!isValidShipmentStatus(d.status)) return NextResponse.json({ error: "Непознат статус." }, { status: 400 });

    const existing = await prisma.shipment.findFirst({ where: { id, companyId: g.companyId, deletedAt: null }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (existing.status === d.status) return NextResponse.json({ ok: true, unchanged: true });

    await prisma.$transaction([
      prisma.shipment.update({ where: { id }, data: { status: d.status } }),
      prisma.shipmentStatusHistory.create({ data: { shipmentId: id, fromStatus: existing.status, toStatus: d.status, changedById: g.userId, note: d.note ?? null } }),
    ]);
    await audit(g.companyId, g.userId, "status", "Shipment", id, `Статус: ${existing.status} → ${d.status}`);
    return NextResponse.json({ ok: true, status: d.status });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
