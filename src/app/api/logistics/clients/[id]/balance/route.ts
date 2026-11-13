import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { buildClientBalance } from "@/lib/logistics/receivables";
import { clientBalanceAggregates } from "@/lib/logistics/receivablesDb";

/**
 * Финансово обобщение на клиент (§4/§13): общо фактурирано, получено, погасено, непогасено,
 * наличен кредит, нетно салдо — ИЗВЕДЕНИ от фактури + активни разпределения. Company-scoped.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, name: true } });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const agg = await clientBalanceAggregates(prisma, g.companyId, id);
  const balance = buildClientBalance({
    invoices: agg.invoices.map((i) => ({ total: i.total, remaining: i.remaining, recState: i.recState })),
    activePaymentsTotal: agg.activePaymentsTotal,
    allocationsTotal: agg.allocationsTotal,
  });
  return NextResponse.json({
    client,
    balance,
    invoices: agg.invoices
      .sort((a, b) => (b.issueDate?.toISOString() ?? "").localeCompare(a.issueDate?.toISOString() ?? ""))
      .map((i) => ({ id: i.id, number: i.number, issueDate: i.issueDate, dueDate: i.dueDate, status: i.status, currency: i.currency, total: i.total, paid: i.paid, remaining: i.remaining, recState: i.recState, needsReconciliation: i.needsReconciliation })),
  });
}
