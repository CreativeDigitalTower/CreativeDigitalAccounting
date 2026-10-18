import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { planFifo } from "@/lib/logistics/receivables";
import { loadClientInvoices } from "@/lib/logistics/receivablesDb";

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
  const mode = sp.get("mode") === "invoice" ? "invoice" : "auto";
  if (!clientId || !(amount > 0)) return NextResponse.json({ error: "clientId + amount required" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId: g.companyId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const invoices = (await loadClientInvoices(prisma, g.companyId, clientId)).filter((i) => i.currency === currency);
  const open = invoices.filter((i) => i.remaining > 0.004);
  const plan = planFifo(amount, open.map((i) => ({ id: i.id, remaining: i.remaining, issueDate: i.issueDate, number: i.number })), mode === "invoice" ? invoiceId : null);
  const byId = new Map(open.map((i) => [i.id, i]));
  return NextResponse.json({
    allocations: plan.allocations.map((a) => ({ ...a, invoiceNumber: byId.get(a.invoiceId)?.number ?? null })),
    credit: plan.credit,
    openInvoices: open.map((i) => ({ id: i.id, number: i.number, issueDate: i.issueDate, total: i.total, paid: i.paid, remaining: i.remaining })),
  });
}
