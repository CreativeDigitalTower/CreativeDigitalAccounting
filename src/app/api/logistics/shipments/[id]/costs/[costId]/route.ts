import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { costBaseAmount } from "@/lib/logistics/costCalc";
import { z } from "zod";

async function owned(companyId: string, id: string, costId: string) {
  return prisma.importCost.findFirst({ where: { id: costId, shipmentId: id, shipment: { companyId } }, select: { id: true, amount: true, fxRate: true } });
}

const schema = z.object({
  amount: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
  fxRate: z.number().positive().nullable().optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  includeInCost: z.boolean().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id, costId } = await params;
    const existing = await owned(g.companyId, id, costId);
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (d.currency !== undefined) data.currency = d.currency;
    if (d.vatRate !== undefined) data.vatRate = d.vatRate;
    if (d.includeInCost !== undefined) data.includeInCost = d.includeInCost;
    if (d.note !== undefined) data.note = d.note;
    // Преизчисляване на baseAmount при промяна на amount/fxRate.
    if (d.amount !== undefined || d.fxRate !== undefined) {
      const amount = d.amount ?? existing.amount;
      const fxRate = d.fxRate ?? existing.fxRate;
      if (d.amount !== undefined) data.amount = amount;
      if (d.fxRate !== undefined) data.fxRate = fxRate;
      data.baseAmount = costBaseAmount(amount, fxRate);
    }
    await prisma.importCost.update({ where: { id: costId }, data });
    await audit(g.companyId, g.userId, "update", "ImportCost", costId, "Редакция на разход");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  const { id, costId } = await params;
  if (!(await owned(g.companyId, id, costId))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.importCost.delete({ where: { id: costId } });
  await audit(g.companyId, g.userId, "delete", "ImportCost", costId, `Изтрит разход на курс ${id}`);
  return NextResponse.json({ ok: true });
}
