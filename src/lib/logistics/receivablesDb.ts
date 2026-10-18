import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sumMoney } from "@/lib/logistics/money";
import { invoicePaid, invoiceRemaining, invoiceStatus, reconciliationState, needsReconciliation, type ReconciliationState } from "@/lib/logistics/receivables";

type Tx = PrismaClient | Prisma.TransactionClient;

export type OpenInvoiceRow = {
  id: string; number: string; issueDate: Date; dueDate: Date | null; status: string; currency: string;
  total: number; paid: number; remaining: number;
  recState: ReconciliationState;   // §3/§5 — съгласуване на заварени фактури
  needsReconciliation: boolean;
};

/** Валидните продажни фактури на клиент (MK receivables): type invoice, не изтрити, не анулирани. */
const INVOICE_WHERE = (companyId: string, clientId: string): Prisma.DocumentWhereInput => ({
  companyId, clientId, type: "invoice", deletedAt: null, status: { not: "cancelled" },
});

/** Тотал на фактура = Σ lineTotal (с ДДС, както се пази на реда при издаване). */
function docTotal(lines: Array<{ lineTotal: number }>): number {
  return sumMoney(lines.map((l) => l.lineTotal));
}

/** Фактурите на клиента с платено/остатък, изведени от АКТИВНИТЕ разпределения. */
export async function loadClientInvoices(db: Tx, companyId: string, clientId: string): Promise<OpenInvoiceRow[]> {
  const docs = await db.document.findMany({
    where: INVOICE_WHERE(companyId, clientId),
    select: {
      id: true, number: true, issueDate: true, dueDate: true, status: true, currency: true,
      lines: { select: { lineTotal: true } },
      paymentAllocations: { where: { payment: { status: "active" } }, select: { amount: true } },
    },
  });
  return docs.map((d) => {
    const total = docTotal(d.lines);
    const paid = invoicePaid(d.paymentAllocations.map((a) => ({ amount: Number(a.amount) })));
    const recState = reconciliationState(d.status, paid);
    return { id: d.id, number: d.number, issueDate: d.issueDate, dueDate: d.dueDate, status: d.status, currency: d.currency, total, paid, remaining: invoiceRemaining(total, paid), recState, needsReconciliation: needsReconciliation(recState) };
  });
}

/**
 * Фактурите, допустими за АВТОМАТИЧНО FIFO разпределение (§5): с реален остатък и БЕЗ нужда
 * от съгласуване. Така новото плащане не погасява заварена фактура с неизвестен действителен
 * остатък, нито „платена" историческа фактура без записи.
 */
export function fifoEligible(rows: OpenInvoiceRow[]): OpenInvoiceRow[] {
  return rows.filter((i) => i.remaining > 0.004 && !i.needsReconciliation);
}

/**
 * Преизчислява платеното и статуса на фактура от активните разпределения (§3). Запазва
 * историческите статуси: пипа статуса само ако има плащания или ако трябва да върне вече
 * маркирана платена/частична към „issued" при сторниране (нулиране на разпределения).
 */
export async function recomputeInvoice(db: Tx, companyId: string, documentId: string, opts?: { restoreStatusIfZero?: string | null }): Promise<void> {
  const doc = await db.document.findFirst({
    where: { id: documentId, companyId },
    select: { id: true, status: true, lines: { select: { lineTotal: true } }, paymentAllocations: { where: { payment: { status: "active" } }, select: { amount: true } } },
  });
  if (!doc) return;
  const total = docTotal(doc.lines);
  const paid = invoicePaid(doc.paymentAllocations.map((a) => ({ amount: Number(a.amount) })));
  const st = invoiceStatus(total, paid);
  let newStatus = doc.status;
  if (st === "paid") newStatus = "paid";
  else if (st === "partially_paid") newStatus = "partially_paid";
  else if (doc.status === "paid" || doc.status === "partially_paid") {
    // Нулирани разпределения (сторниране). При анулиране на ИСТОРИЧЕСКО съгласуване връщаме
    // заварения статус (§8) → фактурата отново изисква съгласуване, вместо да я приемем за
    // изцяло неплатена. Иначе връщаме към „issued".
    newStatus = (opts?.restoreStatusIfZero ?? "issued") as typeof doc.status;
  }
  await db.document.update({ where: { id: documentId }, data: { paidAmount: paid, status: newStatus } });
}

/** Агрегати за клиентското салдо (активни плащания/разпределения). */
export async function clientBalanceAggregates(db: Tx, companyId: string, clientId: string) {
  const invoices = await loadClientInvoices(db, companyId, clientId);
  const payments = await db.clientPayment.findMany({
    where: { companyId, clientId, status: "active" },
    select: { amount: true, allocations: { select: { amount: true } } },
  });
  const activePaymentsTotal = sumMoney(payments.map((p) => Number(p.amount)));
  const allocationsTotal = sumMoney(payments.flatMap((p) => p.allocations.map((a) => Number(a.amount))));
  return { invoices, activePaymentsTotal, allocationsTotal };
}

/** Наличен кредит на клиента (неразпределени активни плащания). */
export async function availableCredit(db: Tx, companyId: string, clientId: string): Promise<number> {
  const { activePaymentsTotal, allocationsTotal } = await clientBalanceAggregates(db, companyId, clientId);
  const c = sumMoney([activePaymentsTotal, -allocationsTotal]);
  return c > 0.004 ? c : 0;
}

export { prisma };
