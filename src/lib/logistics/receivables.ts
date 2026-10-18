/**
 * Чиста логика за клиентски плащания/салда (receivables, логистика/MK). Без DB — тествана
 * изолирано. Decimal-safe чрез money util-а. Салдата/статусите се ИЗВЕЖДАТ от фактури +
 * разпределения (§4), не от мутируемо поле.
 */
import { sumMoney } from "@/lib/logistics/money";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

/** Платено по фактура = сумата на активните разпределения към нея. */
export function invoicePaid(allocations: Array<{ amount: number }>): number {
  return sumMoney(allocations.map((a) => a.amount));
}

/** Остатък = тотал − платено (≥ 0). */
export function invoiceRemaining(total: number, paid: number): number {
  const r = sumMoney([total, -paid]);
  return r < 0 ? 0 : r;
}

/** Статус по тотал/платено. total ≤ 0 → paid (нищо не се дължи). */
export function invoiceStatus(total: number, paid: number): PaymentStatus {
  if (total <= 0) return "paid";
  if (paid <= 0.004) return "unpaid";
  if (sumMoney([total, -paid]) <= 0.004) return "paid";
  return "partially_paid";
}

export type OpenInvoice = { id: string; remaining: number; issueDate: Date | string | null; number: string };
export type Allocation = { invoiceId: string; amount: number };
export type FifoPlan = { allocations: Allocation[]; credit: number };

/** Стабилно подреждане по дата на издаване ASC, после номер (§5). */
export function sortFifo<T extends { issueDate: Date | string | null; number: string }>(invoices: T[]): T[] {
  const key = (d: Date | string | null) => (d == null ? "" : new Date(d).toISOString());
  return [...invoices].sort((a, b) => key(a.issueDate).localeCompare(key(b.issueDate)) || a.number.localeCompare(b.number));
}

/**
 * FIFO разпределение на сума към най-старите непогасени фактури (§5). Всеки ред се ограничава
 * до остатъка си; сумите са Decimal-точни; остатъкът (надплащане) е наличен кредит (§6).
 * `targetFirstId` (опционално, §7) → първо погасява тази фактура, после останалите по FIFO.
 */
export function planFifo(amount: number, invoices: OpenInvoice[], targetFirstId?: string | null): FifoPlan {
  const allocations: Allocation[] = [];
  let left = sumMoney([amount]);
  const open = sortFifo(invoices).filter((i) => i.remaining > 0.004);
  const ordered = targetFirstId ? [...open].sort((a, b) => (a.id === targetFirstId ? -1 : b.id === targetFirstId ? 1 : 0)) : open;
  for (const inv of ordered) {
    if (left <= 0.004) break;
    const take = Math.min(left, inv.remaining);
    const amt = sumMoney([take]);
    if (amt > 0.004) { allocations.push({ invoiceId: inv.id, amount: amt }); left = sumMoney([left, -amt]); }
  }
  return { allocations, credit: left > 0.004 ? left : 0 };
}

export type ClientBalanceInput = {
  invoices: Array<{ total: number }>;               // валидни продажни фактури (не анулирани)
  activePaymentsTotal: number;                      // Σ активни плащания (получени)
  allocationsTotal: number;                         // Σ активни разпределения (погасени)
  outstandingTotal: number;                         // Σ остатъци по непогасени фактури
};
export type ClientBalance = {
  totalInvoiced: number; totalReceived: number; settled: number; outstanding: number; credit: number; net: number;
};

/**
 * Клиентско салдо (§4). credit = получени − разпределени (неразпределен аванс). net =
 * непогасени − наличен кредит (положителен net = клиентът дължи; отрицателен = аванс в полза).
 */
export function buildClientBalance(i: ClientBalanceInput): ClientBalance {
  const totalInvoiced = sumMoney([i.invoices.reduce((a, x) => a + x.total, 0)]);
  const credit = Math.max(0, sumMoney([i.activePaymentsTotal, -i.allocationsTotal]));
  return {
    totalInvoiced,
    totalReceived: sumMoney([i.activePaymentsTotal]),
    settled: sumMoney([i.allocationsTotal]),
    outstanding: sumMoney([i.outstandingTotal]),
    credit,
    net: sumMoney([i.outstandingTotal, -credit]),
  };
}
