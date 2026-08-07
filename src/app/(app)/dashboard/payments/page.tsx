import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PaymentsJournal, type PaymentRow, type RefOption } from "@/components/app/PaymentsJournal";

// Дневник на плащанията — единен регистър на получените и извършените плащания.
export default async function PaymentsPage() {
  const { companyId } = await requireFeature("cash");
  const [rows, clients, suppliers] = await Promise.all([
    prisma.payment.findMany({ where: { companyId }, orderBy: { date: "desc" }, take: 500 }),
    prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const payments: PaymentRow[] = rows.map((p) => ({
    id: p.id, direction: p.direction, status: p.status, amount: p.amount, currency: p.currency,
    date: p.date.toISOString(), dueDate: p.dueDate?.toISOString() ?? null, method: p.method,
    reason: p.reason, counterpartyName: p.counterpartyName, documentRef: p.documentRef,
    bankAccount: p.bankAccount, note: p.note,
  }));
  const clientOpts: RefOption[] = clients.map((c) => ({ id: c.id, name: c.name }));
  const supplierOpts: RefOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }));
  return <PaymentsJournal initial={payments} clients={clientOpts} suppliers={supplierOpts} />;
}
