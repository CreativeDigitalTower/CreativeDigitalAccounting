import { requireAccountingFirm } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accountantMaxClients, effectiveManagedPlan, isPaidClientPlan, planLabel } from "@/lib/constants";
import { computeFirmPartnerStats, generatePartnerCode } from "@/lib/partner";
import { buildFirmOverview, clientHealth, type EnrichedClient } from "@/lib/bi/firm";
import { upcomingStandard } from "@/lib/taxCalendar";
import { FirmDashboard, type FirmInvite } from "@/components/app/FirmDashboard";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FirmPage() {
  const { firm } = await requireAccountingFirm();
  const { t, locale } = await getT();
  const planNameOf = (id: string) => { const l = t(`pricing.plans.${id}.name`); return l.startsWith("pricing.") ? planLabel(id) : l; };

  let partnerCode = firm.partnerCode;
  if (!partnerCode) {
    partnerCode = await generatePartnerCode(firm.name);
    await prisma.company.update({ where: { id: firm.id }, data: { partnerCode } });
  }
  const firmData = { ...firm, partnerCode };

  const clients = await prisma.company.findMany({
    where: { managedByFirmId: firm.id, archivedAt: null },
    select: { id: true, name: true, eik: true, vatRegistered: true, city: true, clientStatus: true, createdAt: true, subscription: { select: { plan: true, paymentStatus: true } } },
    orderBy: { name: "asc" },
  });
  const clientIds = clients.map((c) => c.id);
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const VAT_THRESHOLD_EUR = 51130;

  type Agg = { revenue: number; expenses: number; docs: number; invoices: number; overdue: number; unpaid: number; revThisMonth: number; revLastMonth: number; lastDoc: Date | null };
  const map = new Map<string, Agg>();
  for (const id of clientIds) map.set(id, { revenue: 0, expenses: 0, docs: 0, invoices: 0, overdue: 0, unpaid: 0, revThisMonth: 0, revLastMonth: 0, lastDoc: null });

  let mtdRevenue = 0, mtdVat = 0, mtdExpenses = 0;

  if (clientIds.length) {
    const [invoices, expensesYear, expensesMonth, docCounts] = await Promise.all([
      prisma.document.findMany({
        where: { companyId: { in: clientIds }, type: "invoice" },
        select: { companyId: true, issueDate: true, createdAt: true, dueDate: true, status: true, paidAmount: true, lines: { select: { lineTotal: true, quantity: true, unitPrice: true, vatRate: true } } },
      }),
      prisma.expense.groupBy({ by: ["companyId"], where: { companyId: { in: clientIds }, date: { gte: yearStart } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { companyId: { in: clientIds }, date: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.document.groupBy({ by: ["companyId"], where: { companyId: { in: clientIds } }, _count: { _all: true }, _max: { createdAt: true } }),
    ]);
    for (const inv of invoices) {
      const a = map.get(inv.companyId); if (!a) continue;
      const total = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
      const vat = inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
      a.invoices++;
      const iss = new Date(inv.issueDate);
      if (iss >= yearStart) a.revenue += total;
      if (iss >= monthStart) { a.revThisMonth += total; mtdRevenue += total; mtdVat += vat; }
      else if (iss >= lastMonthStart) a.revLastMonth += total;
      const remaining = inv.status === "paid" ? 0 : Math.max(0, total - (inv.paidAmount ?? 0));
      if (remaining > 0) { a.unpaid += remaining; if (inv.dueDate && new Date(inv.dueDate) < now) a.overdue++; }
    }
    for (const e of expensesYear) { const a = map.get(e.companyId); if (a) a.expenses = e._sum.amount ?? 0; }
    for (const d of docCounts) { const a = map.get(d.companyId); if (a) { a.docs = d._count._all; a.lastDoc = d._max.createdAt ?? null; } }
    mtdExpenses = expensesMonth._sum.amount ?? 0;
  }

  const rows: EnrichedClient[] = clients.map((c) => {
    const a = map.get(c.id)!;
    const plan = c.subscription?.plan ?? "free";
    const paid = isPaidClientPlan(plan) && c.subscription?.paymentStatus === "received";
    const status: EnrichedClient["status"] = paid ? "paid" : (c.clientStatus === "inactive" ? "inactive" : "active");
    const vatState: "" | "near" | "over" = c.vatRegistered ? "" : a.revenue >= VAT_THRESHOLD_EUR ? "over" : a.revenue >= VAT_THRESHOLD_EUR * 0.8 ? "near" : "";
    const profit = a.revenue - a.expenses;
    const lastActivityDays = a.lastDoc ? Math.floor((now.getTime() - new Date(a.lastDoc).getTime()) / 86400000) : null;
    const h = clientHealth({ profit, revenue: a.revenue, overdue: a.overdue, unpaid: a.unpaid, lastActivityDays, vatState });
    return {
      id: c.id, name: c.name, eik: c.eik, vatRegistered: c.vatRegistered, city: c.city,
      planLabel: planNameOf(effectiveManagedPlan(plan)), plan: effectiveManagedPlan(plan), status,
      revenue: a.revenue, expenses: a.expenses, profit, docs: a.docs, invoices: a.invoices,
      overdue: a.overdue, unpaid: a.unpaid, vatState, lastActivityDays,
      revThisMonth: a.revThisMonth, revLastMonth: a.revLastMonth, isNewThisMonth: new Date(c.createdAt) >= monthStart,
      health: h.score, healthTone: h.tone,
    };
  });

  const invitesRaw = await prisma.clientInvite.findMany({ where: { firmId: firm.id, status: { in: ["invited", "accepted"] } }, orderBy: { createdAt: "desc" }, take: 50 });
  const invites: FirmInvite[] = invitesRaw.map((i) => ({ id: i.id, email: i.email, name: i.name, status: i.status, createdAt: i.createdAt.toISOString() }));

  const [stats, firmSub, pendingPayoutCount] = await Promise.all([
    computeFirmPartnerStats(firmData),
    prisma.subscription.findUnique({ where: { companyId: firm.id }, select: { paymentStatus: true } }),
    prisma.commissionPayout.count({ where: { firmId: firm.id, status: "requested" } }),
  ]);
  const firmPaid = firmSub?.paymentStatus === "received";

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const overview = buildFirmOverview({
    clients: rows,
    monthToDate: { revenue: mtdRevenue, expenses: mtdExpenses, vat: mtdVat, progressPct: Math.round((dayOfMonth / daysInMonth) * 100) },
    partner: stats, pendingPayoutCount,
  }, t, locale);

  const deadlines = upcomingStandard(6)
    .filter((d) => d.date >= now)
    .slice(0, 6)
    .map((d) => ({ title: d.title, law: d.law, date: d.date.toISOString(), days: Math.ceil((d.date.getTime() - now.getTime()) / 86400000) }));

  const maxClients = accountantMaxClients(firm.firmPlan);

  return (
    <FirmDashboard
      firmName={firm.name}
      firmId={firm.id}
      paid={firmPaid}
      clients={rows}
      invites={invites}
      overview={overview}
      deadlines={deadlines}
      maxClients={maxClients === Infinity ? null : maxClients}
      partner={stats}
    />
  );
}
