// ─────────────────────────────────────────────────────────────────────────
// Гъвкав модел за отстъпки върху абонамент.
//
// Отстъпката е просто { percent, reason } — независима от плана и billing режима.
// Различни източници произвеждат DiscountRule (мултифирмена, промоционална,
// индивидуална), без да се пренаписва останалата логика. Записва се в
// Subscription.discountPercent / discountReason.
//
// Текущо правило (мултифирмено): първата платена фирма на собственик — 100%
// отстъпка; всяка следваща — 50%.
// ─────────────────────────────────────────────────────────────────────────

export type DiscountRule = { percent: number; reason: string };

export const NO_DISCOUNT: DiscountRule = { percent: 0, reason: "" };

/** Нормализира процент в диапазона 0–100 (цяло число). */
export function clampPercent(p: number | null | undefined): number {
  if (p == null || Number.isNaN(p)) return 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/**
 * Мултифирмена отстъпка според броя ВЕЧЕ платени фирми на собственика.
 * paidCount = колко платени фирми има собственикът ПРЕДИ добавянето на новата.
 *   0  → това е първата платена фирма → 100%
 *   ≥1 → всяка следваща → 50%
 */
export function multiCompanyDiscount(paidCount: number): DiscountRule {
  if (paidCount <= 0) return { percent: 100, reason: "multi_company_first" };
  return { percent: 50, reason: "multi_company_additional" };
}

export type PriceBreakdown = {
  standard: number;   // стандартна (недисконтирана) цена
  discount: number;   // стойност на отстъпката
  final: number;      // крайна цена за плащане
  percent: number;    // приложен процент
};

/** Прилага отстъпка върху базова цена и връща разбивка (закръглено до 2 знака). */
export function applyDiscount(baseAmount: number, percent: number | null | undefined): PriceBreakdown {
  const p = clampPercent(percent);
  const base = Math.max(0, baseAmount);
  const discount = +((base * p) / 100).toFixed(2);
  const final = +(base - discount).toFixed(2);
  return { standard: +base.toFixed(2), discount, final, percent: p };
}
