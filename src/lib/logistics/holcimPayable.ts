/**
 * Чиста финансова логика за задълженията на Metal Trade КЪМ Holcim (payable, §B/§E/§F).
 * Без DB — тествана изолирано. Decimal-safe чрез money util-а.
 *
 * ДВЕ ОСИ (§L), които НЕ се смесват тук: това е САМО payable (Metal Trade → Holcim).
 * Receivable (SEM → Metal Trade) е отделно (MK/export invoices).
 *
 * DOUBLE COUNTING (§F): реалното задължение идва от получената Holcim фактура
 * (SupplierInvoice). Очакваната покупна стойност на доставка се брои САМО докато доставката
 * НЕ е свързана с фактура. Свързана доставка → вече покрита от фактурата → не се брои пак.
 */
import { netAmount, sumMoney } from "@/lib/logistics/money";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

/** Покупна стойност = количество × единична цена (decimal, 2 знака, §B). */
export function computePurchaseAmount(quantity: number | string | null | undefined, unitPrice: number | string | null | undefined): number | null {
  if (quantity == null || unitPrice == null) return null;
  return netAmount(quantity, unitPrice);
}

/** Остатък по фактура = тотал − платено (не под 0). */
export function invoiceRemaining(total: number, paid: number): number {
  return sumMoney([total, -paid]) < 0 ? 0 : sumMoney([total, -paid]);
}

/** Статус на плащане по тотал/платено (§H). total 0 → paid (нищо не се дължи). */
export function paymentStatus(total: number, paid: number): PaymentStatus {
  const remaining = sumMoney([total, -paid]);
  if (total <= 0) return "paid";
  if (paid <= 0) return "unpaid";
  if (remaining <= 0.009) return "paid";
  return "partially_paid";
}

/** Дали плащане би довело до overpayment (§H) — блокира се, освен ако изрично е разрешено. */
export function wouldOverpay(total: number, alreadyPaid: number, newPayment: number): boolean {
  return sumMoney([alreadyPaid, newPayment]) - total > 0.009;
}

export type PayableInvoice = { currency: string; total: number; paid: number };
export type UninvoicedDelivery = { purchaseCurrency: string | null; purchaseAmount: number | null };

export type CurrencyPayable = {
  currency: string;
  invoiced: number;    // ОБЩО ЗАДЪЛЖЕНИЯ (реални Holcim фактури)
  paid: number;        // ПЛАТЕНО
  remaining: number;   // ОСТАВА ЗА ПЛАЩАНЕ
  uninvoiced: number;  // НЕФАКТУРИРАНИ / ОЧАКВАЩИ Holcim фактура (estimated)
};

/**
 * KPI по валута (§E) — БЕЗ смесване на различни валути (§E/§18). `uninvoicedDeliveries` са
 * доставки с purchaseAmount, които НЯМАТ свързана Holcim фактура (double-counting защита, §F).
 */
export function buildPayableSummary(invoices: PayableInvoice[], uninvoicedDeliveries: UninvoicedDelivery[]): CurrencyPayable[] {
  const byCur = new Map<string, CurrencyPayable>();
  const ensure = (cur: string) => {
    let r = byCur.get(cur);
    if (!r) { r = { currency: cur, invoiced: 0, paid: 0, remaining: 0, uninvoiced: 0 }; byCur.set(cur, r); }
    return r;
  };
  for (const inv of invoices) {
    const r = ensure(inv.currency || "EUR");
    r.invoiced = sumMoney([r.invoiced, inv.total]);
    r.paid = sumMoney([r.paid, inv.paid]);
  }
  for (const d of uninvoicedDeliveries) {
    if (d.purchaseAmount == null) continue;
    const r = ensure(d.purchaseCurrency || "EUR");
    r.uninvoiced = sumMoney([r.uninvoiced, d.purchaseAmount]);
  }
  for (const r of byCur.values()) r.remaining = invoiceRemaining(r.invoiced, r.paid);
  return [...byCur.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
