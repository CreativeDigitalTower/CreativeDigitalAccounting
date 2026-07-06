import { requireAccountingFirm } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accountantMaxClients } from "@/lib/constants";
import { FirmDashboard, type FirmClient } from "@/components/app/FirmDashboard";

export const dynamic = "force-dynamic";

export default async function FirmPage() {
  const { firm } = await requireAccountingFirm();

  const clients = await prisma.company.findMany({
    where: { managedByFirmId: firm.id, archivedAt: null },
    select: { id: true, name: true, eik: true, vatRegistered: true, city: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  const clientIds = clients.map((c) => c.id);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  // Приходи (фактури тази година), разходи и брой документи — на клиент
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

  const rows: FirmClient[] = clients.map((c) => ({
    id: c.id, name: c.name, eik: c.eik, vatRegistered: c.vatRegistered, city: c.city,
    revenue: revenueByClient.get(c.id) ?? 0,
    expenses: expenseByClient.get(c.id) ?? 0,
    docs: docsByClient.get(c.id) ?? 0,
  }));

  const totals = {
    clients: rows.length,
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    expenses: rows.reduce((s, r) => s + r.expenses, 0),
    docs: rows.reduce((s, r) => s + r.docs, 0),
    vatRegistered: rows.filter((r) => r.vatRegistered).length,
  };
  const maxClients = accountantMaxClients(firm.firmPlan);

  return <FirmDashboard firmName={firm.name} clients={rows} totals={totals} maxClients={maxClients === Infinity ? null : maxClients} />;
}
