/**
 * Чисти аналитични изчисления (раздел 45-50) — тествани. Всичко се агрегира от
 * операционните данни; тук е само математиката (проценти, марж, top-N, сравнение).
 */
import { sumMoney } from "@/lib/logistics/money";

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

/** Процентна промяна prev→cur. null ако няма база (prev = 0). */
export function pctChange(prev: number, cur: number): number | null {
  if (!prev) return null;
  return round2(((cur - prev) / prev) * 100);
}

export type Profitability = { purchase: number; costs: number; revenue: number; gross: number; marginPct: number | null };

/** Печалба/марж: брутен резултат = приходи − покупка − разходи; марж % спрямо приходите. */
export function profitability(purchase: number, costs: number, revenue: number): Profitability {
  const p = sumMoney([purchase]); const c = sumMoney([costs]); const r = sumMoney([revenue]);
  const gross = sumMoney([r, -p, -c]);
  return { purchase: p, costs: c, revenue: r, gross, marginPct: r > 0 ? round2((gross / r) * 100) : null };
}

/** Топ N по числова стойност (desc). */
export function topN<T>(items: T[], value: (t: T) => number, n: number): T[] {
  return [...items].sort((a, b) => value(b) - value(a)).slice(0, n);
}

export type PeriodCompare = { label: string; prev: number; cur: number; changePct: number | null };

/** Сравнение на две числа с етикет (напр. „Оборот", 2025 vs 2026). */
export function comparePeriod(label: string, prev: number, cur: number): PeriodCompare {
  return { label, prev: round2(prev), cur: round2(cur), changePct: pctChange(prev, cur) };
}

export type ProductAnalytics = {
  product: string;
  soldQuantity: number; salesRevenue: number; avgSalePrice: number | null;
  purchaseQuantity: number; purchaseValue: number; avgPurchasePrice: number | null;
  marginPerUnit: number | null;
};

/**
 * Анализ по продукт: продадено (количество/оборот/средна цена) vs покупка (средна цена),
 * и марж на единица = средна продажна − средна покупна цена.
 */
export function productAnalytics(
  sales: { product: string; quantity: number; revenue: number }[],
  purchases: { product: string; quantity: number; value: number }[]
): ProductAnalytics[] {
  const map = new Map<string, ProductAnalytics>();
  const get = (p: string) => map.get(p) ?? { product: p, soldQuantity: 0, salesRevenue: 0, avgSalePrice: null, purchaseQuantity: 0, purchaseValue: 0, avgPurchasePrice: null, marginPerUnit: null };
  for (const s of sales) { const a = get(s.product); a.soldQuantity = round3(a.soldQuantity + s.quantity); a.salesRevenue = sumMoney([a.salesRevenue, s.revenue]); map.set(s.product, a); }
  for (const p of purchases) { const a = get(p.product); a.purchaseQuantity = round3(a.purchaseQuantity + p.quantity); a.purchaseValue = sumMoney([a.purchaseValue, p.value]); map.set(p.product, a); }
  for (const a of map.values()) {
    a.avgSalePrice = a.soldQuantity > 0 ? round2(a.salesRevenue / a.soldQuantity) : null;
    a.avgPurchasePrice = a.purchaseQuantity > 0 ? round2(a.purchaseValue / a.purchaseQuantity) : null;
    a.marginPerUnit = a.avgSalePrice != null && a.avgPurchasePrice != null ? round2(a.avgSalePrice - a.avgPurchasePrice) : null;
  }
  return [...map.values()].sort((a, b) => b.salesRevenue - a.salesRevenue);
}
