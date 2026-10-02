import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { sumMoney } from "@/lib/logistics/money";
import { invoiceRemaining, paymentStatus, wouldOverpay } from "@/lib/logistics/holcimPayable";
import { z } from "zod";

/** Тотал (с ДДС) + платено по Holcim фактура — company-scoped (IDOR-safe). */
async function loadInvoice(companyId: string, id: string) {
  const inv = await prisma.supplierInvoice.findFirst({
    where: { id, companyId }, select: { id: true, number: true, currency: true, supplierId: true, links: { select: { grossAmount: true } } },
  });
  if (!inv) return null;
  const total = sumMoney(inv.links.map((l) => l.grossAmount));
  const payments = await prisma.payment.findMany({ where: { companyId, direction: "out", documentId: id }, select: { amount: true } });
  const paid = sumMoney(payments.map((p) => p.amount));
  return { inv, total, paid };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const loaded = await loadInvoice(g.companyId, id);
  if (!loaded) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const payments = await prisma.payment.findMany({ where: { companyId: g.companyId, direction: "out", documentId: id }, select: { id: true, amount: true, date: true, reason: true, note: true, method: true }, orderBy: { date: "asc" } });
  return NextResponse.json({
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    total: loaded.total, paid: loaded.paid, remaining: invoiceRemaining(loaded.total, loaded.paid), paymentStatus: paymentStatus(loaded.total, loaded.paid),
  });
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  amount: z.number().positive().optional(),       // конкретна сума
  markRemaining: z.boolean().optional(),          // „Маркирай като платена" → остатъка
  date: optDate,
  note: z.string().max(500).nullable().optional(),
  method: z.string().max(60).nullable().optional(),
  allowOverpay: z.boolean().optional(),           // явно разрешение (§H)
});

// Добавяне на плащане към Holcim фактура (§H). Финансово действие → manage_invoices.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const loaded = await loadInvoice(g.companyId, id);
    if (!loaded) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const remaining = invoiceRemaining(loaded.total, loaded.paid);

    const amount = d.markRemaining ? remaining : d.amount;
    if (amount == null || amount <= 0) return NextResponse.json({ error: "Невалидна сума." }, { status: 400 });
    if (!d.allowOverpay && wouldOverpay(loaded.total, loaded.paid, amount)) {
      return NextResponse.json({ error: "Сумата надвишава остатъка по фактурата.", remaining }, { status: 409 });
    }

    const payment = await prisma.payment.create({
      data: {
        companyId: g.companyId, direction: "out", status: "completed", amount, currency: loaded.inv.currency,
        date: d.date ? new Date(d.date) : new Date(), method: d.method || "bank_transfer",
        supplierId: loaded.inv.supplierId ?? null, documentId: id, documentRef: loaded.inv.number,
        reason: d.note ?? null, createdById: g.userId,
      },
      select: { id: true, amount: true, date: true },
    });
    const newPaid = sumMoney([loaded.paid, amount]);
    await audit(g.companyId, g.userId, "payment", "SupplierInvoice", id, `Плащане ${amount} ${loaded.inv.currency} към Holcim фактура ${loaded.inv.number}`);
    return NextResponse.json({ ok: true, payment: { ...payment, amount: Number(payment.amount) }, paid: newPaid, remaining: invoiceRemaining(loaded.total, newPaid), paymentStatus: paymentStatus(loaded.total, newPaid) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

const delSchema = z.object({ paymentId: z.string() });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const { paymentId } = delSchema.parse(await req.json());
    // company + invoice scoped (IDOR-safe): триеме само плащане на ТАЗИ фактура.
    const res = await prisma.payment.deleteMany({ where: { id: paymentId, companyId: g.companyId, direction: "out", documentId: id } });
    if (res.count === 0) return NextResponse.json({ error: "Плащането не е намерено." }, { status: 404 });
    await audit(g.companyId, g.userId, "payment_delete", "SupplierInvoice", id, `Изтрито плащане по Holcim фактура`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
