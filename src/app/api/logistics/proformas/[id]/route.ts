import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { proformaBalance } from "@/lib/logistics/purchaseCalc";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const p = await prisma.logisticsProforma.findFirst({
    where: { id, companyId: g.companyId },
    select: {
      id: true, number: true, date: true, supplierId: true, productSnapshot: true, initialQuantity: true,
      unit: true, currency: true, unitPrice: true, status: true, note: true,
      allocations: { select: { id: true, quantity: true, shipment: { select: { id: true, code: true, dispatchNoteNumber: true, dispatchDate: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const bal = proformaBalance(p.initialQuantity, p.allocations.map((a) => a.quantity));
  return NextResponse.json({ ...p, used: bal.used, remaining: bal.remaining, negative: bal.negative });
}

const schema = z.object({
  number: z.string().max(120).nullable().optional(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  initialQuantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(8).optional(),
  status: z.enum(["active", "closed", "cancelled"]).optional(),
  note: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.logisticsProforma.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (d.number !== undefined) data.number = d.number;
    if (d.date !== undefined) data.date = d.date ? new Date(d.date) : null;
    if (d.initialQuantity !== undefined) data.initialQuantity = d.initialQuantity;
    if (d.unitPrice !== undefined) data.unitPrice = d.unitPrice;
    if (d.currency !== undefined) data.currency = d.currency;
    if (d.status !== undefined) data.status = d.status;
    if (d.note !== undefined) data.note = d.note;
    await prisma.logisticsProforma.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "LogisticsProforma", id, "Редакция на проформа");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
