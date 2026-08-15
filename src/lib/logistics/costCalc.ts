/**
 * Себестойност на курс (раздел 49) — чисти изчисления, decimal-safe. Тествани.
 * Икономическата себестойност = покупна стойност + разходи при внос, които са
 * маркирани да влизат в себестойността (ДДВ по подразбиране НЕ влиза).
 */
import { sumMoney, netAmount } from "@/lib/logistics/money";

/** Стойност на разход в базовата валута = amount × fxRate. */
export function costBaseAmount(amount: number, fxRate: number | null | undefined): number {
  const rate = fxRate == null || !(fxRate > 0) ? 1 : fxRate;
  return netAmount(amount, rate); // decimal, 2 знака
}

export type CostLine = { baseAmount: number; includeInCost: boolean };

export type CostSummary = {
  purchase: number;   // покупна стойност (база)
  costsIncluded: number; // разходи, влизащи в себестойността
  costsExcluded: number; // разходи извън себестойността (напр. ДДВ)
  totalCost: number;  // себестойност = покупка + costsIncluded
};

/** Обобщение на себестойността за курс. purchase е нето покупната стойност (база). */
export function shipmentCostSummary(purchase: number, costs: CostLine[]): CostSummary {
  const included = sumMoney(costs.filter((c) => c.includeInCost).map((c) => c.baseAmount));
  const excluded = sumMoney(costs.filter((c) => !c.includeInCost).map((c) => c.baseAmount));
  const p = sumMoney([purchase]);
  return { purchase: p, costsIncluded: included, costsExcluded: excluded, totalCost: sumMoney([p, included]) };
}

/** Курс за конвертиране от quote валута към base: base = amountQuote / rate (rate = quote за 1 base). */
export function fxRateFromRegistry(rate: number | null | undefined): number {
  if (!rate || !(rate > 0)) return 1;
  return Math.round((1 / rate) * 1e8) / 1e8;
}
