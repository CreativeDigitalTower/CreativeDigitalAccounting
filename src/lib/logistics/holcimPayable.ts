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
// Нефактурирана (без SupplierInvoiceExportLink) доставка. `paid` = provisional settlement
// (ExportDocumentSet.purchasePaidAt != null) — отбелязана като платена ПРЕДИ Holcim фактура.
export type UninvoicedDelivery = { purchaseCurrency: string | null; purchaseAmount: number | null; paid?: boolean };

export type CurrencyPayable = {
  currency: string;
  totalObligations: number; // ОБЩО ЗАДЪЛЖЕНИЯ = фактурирани + нефактурирани (grand total, §3)
  paid: number;             // ПЛАТЕНО = плащания по фактури + provisional платени доставки (§4)
  remaining: number;        // ОСТАВА = ОБЩО − ПЛАТЕНО (§5)
  uninvoiced: number;       // НЕФАКТУРИРАНИ (без Holcim фактура) — платени ИЛИ не (§11)
};

/**
 * KPI по валута (§3/§4/§5/§11) — БЕЗ смесване на валути (§17), Decimal (§15).
 *
 * totalObligations = Σ фактури (gross) + Σ нефактурирани purchaseAmount (без double counting —
 *   свързаните доставки не влизат в `uninvoicedDeliveries`, §10).
 * paid = Σ плащания по фактури + Σ purchaseAmount на provisional-ПЛАТЕНИ нефактурирани доставки.
 * remaining = totalObligations − paid (≥ 0).
 * uninvoiced = Σ всички нефактурирани purchaseAmount (платени или не — нефактурирано ≠ неплатено).
 */
export function buildPayableSummary(invoices: PayableInvoice[], uninvoicedDeliveries: UninvoicedDelivery[]): CurrencyPayable[] {
  type Acc = { currency: string; invoicedTotal: number; invoicedPaid: number; provTotal: number; provPaid: number };
  const byCur = new Map<string, Acc>();
  const ensure = (cur: string) => {
    let r = byCur.get(cur);
    if (!r) { r = { currency: cur, invoicedTotal: 0, invoicedPaid: 0, provTotal: 0, provPaid: 0 }; byCur.set(cur, r); }
    return r;
  };
  for (const inv of invoices) {
    const r = ensure(inv.currency || "EUR");
    r.invoicedTotal = sumMoney([r.invoicedTotal, inv.total]);
    r.invoicedPaid = sumMoney([r.invoicedPaid, inv.paid]);
  }
  for (const d of uninvoicedDeliveries) {
    if (d.purchaseAmount == null) continue;
    const r = ensure(d.purchaseCurrency || "EUR");
    r.provTotal = sumMoney([r.provTotal, d.purchaseAmount]);
    if (d.paid) r.provPaid = sumMoney([r.provPaid, d.purchaseAmount]);
  }
  return [...byCur.values()].map((r) => {
    const totalObligations = sumMoney([r.invoicedTotal, r.provTotal]);
    const paid = sumMoney([r.invoicedPaid, r.provPaid]);
    return { currency: r.currency, totalObligations, paid, remaining: invoiceRemaining(totalObligations, paid), uninvoiced: r.provTotal };
  }).sort((a, b) => a.currency.localeCompare(b.currency));
}
