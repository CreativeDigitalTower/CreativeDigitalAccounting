import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { planFifo } from "@/lib/logistics/receivables";
import { loadClientInvoices, fifoEligible } from "@/lib/logistics/receivablesDb";

/**
 * Преглед на предложеното разпределение преди запис (§7) — БЕЗ writes. Връща план + текущите
 * непогасени фактури (с остатъци). Клиентът трябва да потвърди; при реалния POST салдото се
 * преизчислява в транзакция (§12).
 */
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const clientId = sp.get("clientId");
  const amount = Number(sp.get("amount") || 0);
  const invoiceId = sp.get("invoiceId");
  const currency = sp.get("currency") || "MKD";
  const m = sp.get("mode");
  const mode = m === "invoice" ? "invoice" : m === "historical" ? "historical" : "auto";
  if (!clientId || !(amount > 0)) return NextResponse.json({ error: "clientId + amount required" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId: g.companyId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const invoices = (await loadClientInvoices(prisma, g.companyId, clientId)).filter((i) => i.currency === currency);

  if (mode === "historical") {
    // Съгласуване: разпределяме само към избраната фактура, до нейната стойност; остатъкът → кредит.
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return NextResponse.json({ allocations: [], credit: amount, openInvoices: [] });
    const amt = Math.min(amount, target.total);
    return NextResponse.json({
      allocations: amt > 0.004 ? [{ invoiceId: target.id, amount: Math.round(amt * 100) / 100, invoiceNumber: target.number }] : [],
      credit: Math.max(0, Math.round((amount - amt) * 100) / 100),
      openInvoices: [{ id: target.id, number: target.number, issueDate: target.issueDate, total: target.total, paid: target.paid, remaining: target.remaining }],
    });
  }

  const open = fifoEligible(invoices); // §5 — само допустими за авто-FIFO
  const plan = planFifo(amount, open.map((i) => ({ id: i.id, remaining: i.remaining, issueDate: i.issueDate, number: i.number })), mode === "invoice" ? invoiceId : null);
  const byId = new Map(open.map((i) => [i.id, i]));
  return NextResponse.json({
    allocations: plan.allocations.map((a) => ({ ...a, invoiceNumber: byId.get(a.invoiceId)?.number ?? null })),
    credit: plan.credit,
    openInvoices: open.map((i) => ({ id: i.id, number: i.number, issueDate: i.issueDate, total: i.total, paid: i.paid, remaining: i.remaining })),
  });
}
