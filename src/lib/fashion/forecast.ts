/**
 * Чисти формули за stock cover + препоръчано производство (§25, §26) — без DB, без AI.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Средни месечни продажби = продадени за прозореца / брой месеци. */
export function avgMonthlySales(soldInWindow: number, windowMonths: number): number {
  if (windowMonths <= 0) return 0;
  return D(soldInWindow).div(windowMonths).toDecimalPlaces(2).toNumber();
}

/**
 * Оценено покритие на наличността в ДНИ = наличност / (средни месечни продажби / 30).
 * Пример: наличност 8, средно 21/месец → ~11 дни. null при липса на продажби.
 */
export function stockCoverDays(currentStock: number, avgMonthly: number): number | null {
  if (avgMonthly <= 0) return null;
  const perDay = D(avgMonthly).div(30);
  return D(currentStock).div(perDay).toDecimalPlaces(1).toNumber();
}

/**
 * Препоръчано количество за производство:
 *   target = max(минимална наличност, средни месечни × целеви месеци покритие)
 *   suggested = max(0, ceil(target − текуща наличност))
 */
export function suggestedProduction(currentStock: number, avgMonthly: number, minStock: number, targetMonths: number): number {
  const target = Math.max(minStock, D(avgMonthly).times(targetMonths).toNumber());
  const need = target - currentStock;
  return need > 0 ? Math.ceil(need) : 0;
}
