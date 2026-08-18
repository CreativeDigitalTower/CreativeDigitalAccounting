/**
 * Чисти аналитични съотношения (§24) — без DB, тестируемо изолирано. Всички връщат 0
 * при нулев знаменател (без деление на 0).
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);
const pct = (num: number, den: number) => den > 0 ? D(num).div(den).times(100).toDecimalPlaces(2).toNumber() : 0;

/** Sell-through = продадени / произведени (§24). */
export function sellThroughRate(sold: number, produced: number): number {
  return pct(sold, produced);
}

/** Defect Rate = дефектни / произведени. */
export function defectRate(defective: number, produced: number): number {
  return pct(defective, produced);
}

/** Material Waste % = реален отпадък / реално използван материал. */
export function materialWastePct(waste: number, used: number): number {
  return pct(waste, used);
}

/** Cost Variance % = (реален − стандартен) / стандартен × 100. */
export function costVariancePct(actual: number, standard: number): number {
  return standard > 0 ? D(actual).minus(standard).div(standard).times(100).toDecimalPlaces(2).toNumber() : 0;
}

/** Брутен марж % = печалба / приход × 100. */
export function grossMarginPct(revenue: number, grossProfit: number): number {
  return pct(grossProfit, revenue);
}

export type RankItem = { key: string; value: number };
/** Топ N по стойност (низходящо). */
export function topN(items: RankItem[], n: number): RankItem[] {
  return [...items].sort((a, b) => b.value - a.value).slice(0, n);
}
/** Bottom N по стойност (възходящо) — за slow movers. */
export function bottomN(items: RankItem[], n: number): RankItem[] {
  return [...items].sort((a, b) => a.value - b.value).slice(0, n);
}
