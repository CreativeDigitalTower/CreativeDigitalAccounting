import { requireAccountingFirm } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accountantMaxClients, effectiveManagedPlan, isPaidClientPlan, planLabel } from "@/lib/constants";
import { computeFirmPartnerStats, generatePartnerCode } from "@/lib/partner";
import { FirmDashboard, type FirmClient, type FirmInvite } from "@/components/app/FirmDashboard";

export const dynamic = "force-dynamic";

export default async function FirmPage() {
  const { firm } = await requireAccountingFirm();

  // Гарантираме партньорски код (за фирми, регистрирани преди програмата)
  let partnerCode = firm.partnerCode;
  if (!partnerCode) {
    partnerCode = await generatePartnerCode(firm.name);
    await prisma.company.update({ where: { id: firm.id }, data: { partnerCode } });
  }
  const firmData = { ...firm, partnerCode };

  const clients = await prisma.company.findMany({
    where: { managedByFirmId: firm.id, archivedAt: null },
    select: {
      id: true, name: true, eik: true, vatRegistered: true, city: true, clientStatus: true,
      subscription: { select: { plan: true, paymentStatus: true } },
    },
    orderBy: { name: "asc" },
  });
  const clientIds = clients.map((c) => c.id);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const revenueByClient = new Map<string, number>();
  const expenseByClient = new Map<string, number>();
  const docsByClient = new Map<string, number>();

  if (clientIds.length) {
    const [invoices, expenses, docCounts] = await Promise.all([
      prisma.document.findMany({
        where: { companyId: { in: clientIds }, type: "invoice", issueDate: { gte: yearStart } },
        select: { companyId: true, lines: { select: { lineTotal: true } } },
      }),
      prisma.expense.groupBy({ by: ["companyId"], where: { companyId: { in: clientIds }, date: { gte: yearStart } }, _sum: { amount: true } }),
      prisma.document.groupBy({ by: ["companyId"], where: { companyId: { in: clientIds } }, _count: { _all: true } }),
    ]);
    for (const inv of invoices) {
      const t = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
      revenueByClient.set(inv.companyId, (revenueByClient.get(inv.companyId) ?? 0) + t);
    }
    for (const e of expenses) expenseByClient.set(e.companyId, e._sum.amount ?? 0);
    for (const d of docCounts) docsByClient.set(d.companyId, d._count._all);
  }

  const rows: FirmClient[] = clients.map((c) => {
    const plan = c.subscription?.plan ?? "free";
    const paid = isPaidClientPlan(plan) && c.subscription?.paymentStatus === "received";
    const status = paid ? "paid" : (c.clientStatus === "inactive" ? "inactive" : "active");
    return {
      id: c.id, name: c.name, eik: c.eik, vatRegistered: c.vatRegistered, city: c.city,
      planLabel: planLabel(effectiveManagedPlan(plan)), status,
      revenue: revenueByClient.get(c.id) ?? 0,
      expenses: expenseByClient.get(c.id) ?? 0,
      docs: docsByClient.get(c.id) ?? 0,
    };
  });

  const invitesRaw = await prisma.clientInvite.findMany({
    where: { firmId: firm.id, status: { in: ["invited", "accepted"] } },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  const invites: FirmInvite[] = invitesRaw.map((i) => ({
    id: i.id, email: i.email, name: i.name, status: i.status, createdAt: i.createdAt.toISOString(),
  }));

  const stats = await computeFirmPartnerStats(firmData);
  const totals = {
    clients: rows.length,
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    expenses: rows.reduce((s, r) => s + r.expenses, 0),
    docs: rows.reduce((s, r) => s + r.docs, 0),
    vatRegistered: rows.filter((r) => r.vatRegistered).length,
  };
  const maxClients = accountantMaxClients(firm.firmPlan);

  return (
    <FirmDashboard
      firmName={firm.name}
      clients={rows}
      invites={invites}
      totals={totals}
      maxClients={maxClients === Infinity ? null : maxClients}
      partner={stats}
    />
  );
}
