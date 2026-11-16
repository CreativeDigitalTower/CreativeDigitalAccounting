import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { planFifo } from "@/lib/logistics/receivables";
import { loadClientInvoices, fifoEligible, recomputeInvoice } from "@/lib/logistics/receivablesDb";
import { z } from "zod";

class ReconcileError extends Error {}

// GET → плащанията на клиент (история), company-scoped.
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const payments = await prisma.clientPayment.findMany({
    where: { companyId: g.companyId, clientId },
    select: { id: true, date: true, amount: true, currency: true, method: true, reference: true, note: true, status: true, source: true, createdAt: true, voidedAt: true, voidReason: true,
      allocations: { select: { amount: true, document: { select: { id: true, number: true } } } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(payments.map((p) => ({
    ...p, amount: Number(p.amount),
    allocated: p.allocations.reduce((a, x) => a + Number(x.amount), 0),
    allocations: p.allocations.map((a) => ({ amount: Number(a.amount), invoiceId: a.document.id, invoiceNumber: a.document.number })),
  })));
}

// Избери само нужните полета в GET-а (вкл. source), за да е ясно историческо ли е плащането.

const schema = z.object({
  clientId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime().optional().or(z.literal("").transform(() => null)).nullable(),
  method: z.string().max(60).optional(),
  reference: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  currency: z.string().max(8).optional(),
  mode: z.enum(["auto", "invoice", "historical"]).default("auto"), // historical = съгласуване на заварена фактура (§2)
  invoiceId: z.string().nullable().optional(),       // задължителен при mode=invoice/historical
  idempotencyKey: z.string().max(100).nullable().optional(),
  confirmDuplicate: z.boolean().optional(),          // §2 — изрично потвърждение при възможен дубъл
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

    if ((d.mode === "invoice" || d.mode === "historical") && !d.invoiceId)
      return NextResponse.json({ error: "Изисква се фактура." }, { status: 400 });

    // Idempotency (§12): същ ключ за фирмата → връщаме съществуващото плащане, без дубъл.
    if (d.idempotencyKey) {
      const existing = await prisma.clientPayment.findFirst({ where: { companyId: g.companyId, idempotencyKey: d.idempotencyKey }, select: { id: true } });
      if (existing) return NextResponse.json({ ok: true, id: existing.id, idempotent: true });
    }

    // Защита от дубъл историческо плащане (§2): ако вече има активно историческо плащане по
    // същата фактура, искаме изрично потвърждение преди да запишем второ.
    if (d.mode === "historical" && !d.confirmDuplicate) {
      const dup = await prisma.clientPayment.findFirst({
        where: { companyId: g.companyId, clientId: d.clientId, source: "historical", status: "active", allocations: { some: { documentId: d.invoiceId! } } },
        select: { id: true, amount: true, date: true },
      });
      if (dup) return NextResponse.json({ error: "duplicate_historical", existing: { id: dup.id, amount: Number(dup.amount), date: dup.date } }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const all = (await loadClientInvoices(tx, g.companyId, d.clientId)).filter((i) => i.currency === currency); // без смесване на валути (§12)

      if (d.mode === "historical") {
        // Съгласуване на конкретна заварена фактура: разпределяме САМО към нея (без разливане),
        // до нейната стойност; запазваме заварения статус за коректно връщане при анулиране (§8).
        const target = all.find((i) => i.id === d.invoiceId);
        if (!target) throw new ReconcileError("invoice_not_found");
        const take = Math.min(d.amount, target.total);
        const amt = Math.round(take * 100) / 100;
        const priorStatus = target.status; // статус преди съгласуването → за коректно връщане при анулиране (§8)
        const payment = await tx.clientPayment.create({
          data: {
            companyId: g.companyId, clientId: d.clientId, amount: d.amount, currency,
            date: d.date ? new Date(d.date) : new Date(), method: d.method || "bank_transfer",
            reference: d.reference ?? null, note: d.note ?? null, status: "active",
            source: "historical", priorStatus,
            idempotencyKey: d.idempotencyKey ?? null, createdById: g.userId,
            allocations: amt > 0.004 ? { create: [{ documentId: target.id, amount: amt, createdById: g.userId }] } : undefined,
          },
          select: { id: true },
        });
        if (amt > 0.004) await recomputeInvoice(tx, g.companyId, target.id);
        return { id: payment.id, allocations: amt > 0.004 ? [{ invoiceId: target.id, amount: amt }] : [], credit: Math.max(0, Math.round((d.amount - amt) * 100) / 100), source: "historical" as const };
      }

      // auto/invoice: авто-FIFO само по ДОПУСТИМИ фактури (§5) — без заварени за съгласуване.
      const eligible = fifoEligible(all);
      const plan = planFifo(d.amount, eligible.map((i) => ({ id: i.id, remaining: i.remaining, issueDate: i.issueDate, number: i.number })), d.mode === "invoice" ? d.invoiceId : null);
      const payment = await tx.clientPayment.create({
        data: {
          companyId: g.companyId, clientId: d.clientId, amount: d.amount, currency,
          date: d.date ? new Date(d.date) : new Date(), method: d.method || "bank_transfer",
          reference: d.reference ?? null, note: d.note ?? null, status: "active",
          source: "manual",
          idempotencyKey: d.idempotencyKey ?? null, createdById: g.userId,
          allocations: { create: plan.allocations.map((a) => ({ documentId: a.invoiceId, amount: a.amount, createdById: g.userId })) },
        },
        select: { id: true },
      });
      for (const a of plan.allocations) await recomputeInvoice(tx, g.companyId, a.invoiceId);
      return { id: payment.id, allocations: plan.allocations, credit: plan.credit, source: "manual" as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await audit(g.companyId, g.userId, result.source === "historical" ? "payment_historical" : "payment", "ClientPayment", result.id, `${result.source === "historical" ? "Историческо плащане" : "Плащане"} ${d.amount} ${currency} от клиент; разпределено по ${result.allocations.length} фактури, кредит ${result.credit}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ReconcileError) return NextResponse.json({ error: "Фактурата не е намерена." }, { status: 404 });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Плащането вече е записано." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
