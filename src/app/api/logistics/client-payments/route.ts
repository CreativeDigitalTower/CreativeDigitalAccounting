import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { planFifo } from "@/lib/logistics/receivables";
import { loadClientInvoices, recomputeInvoice } from "@/lib/logistics/receivablesDb";
import { z } from "zod";

// GET → плащанията на клиент (история), company-scoped.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const payments = await prisma.clientPayment.findMany({
    where: { companyId: g.companyId, clientId },
    select: { id: true, date: true, amount: true, currency: true, method: true, reference: true, note: true, status: true, voidedAt: true, voidReason: true,
      allocations: { select: { amount: true, document: { select: { id: true, number: true } } } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(payments.map((p) => ({
    ...p, amount: Number(p.amount),
    allocated: p.allocations.reduce((a, x) => a + Number(x.amount), 0),
    allocations: p.allocations.map((a) => ({ amount: Number(a.amount), invoiceId: a.document.id, invoiceNumber: a.document.number })),
  })));
}

const schema = z.object({
  clientId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime().optional().or(z.literal("").transform(() => null)).nullable(),
  method: z.string().max(60).optional(),
  reference: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  currency: z.string().max(8).optional(),
  mode: z.enum(["auto", "invoice"]).default("auto"),
  invoiceId: z.string().nullable().optional(),       // при mode=invoice
  idempotencyKey: z.string().max(100).nullable().optional(),
});

// POST → регистрира плащане + FIFO/целево разпределение + преизчисляване на статусите (§2/§5/§7).
export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const client = await prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
    const currency = d.currency || "MKD";

    // Idempotency (§12): същ ключ за фирмата → връщаме съществуващото плащане, без дубъл.
    if (d.idempotencyKey) {
      const existing = await prisma.clientPayment.findFirst({ where: { companyId: g.companyId, idempotencyKey: d.idempotencyKey }, select: { id: true } });
      if (existing) return NextResponse.json({ ok: true, id: existing.id, idempotent: true });
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoices = (await loadClientInvoices(tx, g.companyId, d.clientId)).filter((i) => i.currency === currency); // без смесване на валути (§12)
      const plan = planFifo(d.amount, invoices.map((i) => ({ id: i.id, remaining: i.remaining, issueDate: i.issueDate, number: i.number })), d.mode === "invoice" ? d.invoiceId : null);
      const payment = await tx.clientPayment.create({
        data: {
          companyId: g.companyId, clientId: d.clientId, amount: d.amount, currency,
          date: d.date ? new Date(d.date) : new Date(), method: d.method || "bank_transfer",
          reference: d.reference ?? null, note: d.note ?? null, status: "active",
          idempotencyKey: d.idempotencyKey ?? null, createdById: g.userId,
          allocations: { create: plan.allocations.map((a) => ({ documentId: a.invoiceId, amount: a.amount, createdById: g.userId })) },
        },
        select: { id: true },
      });
      for (const a of plan.allocations) await recomputeInvoice(tx, g.companyId, a.invoiceId);
      return { id: payment.id, allocations: plan.allocations, credit: plan.credit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await audit(g.companyId, g.userId, "payment", "ClientPayment", result.id, `Плащане ${d.amount} ${currency} от клиент; разпределено по ${result.allocations.length} фактури, кредит ${result.credit}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Плащането вече е записано." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
