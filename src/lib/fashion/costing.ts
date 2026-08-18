/**
 * Чиста логика за себестойност (§20, §21, §22) — без DB, тестируемо изолирано.
 * Manufacturing = Direct Materials + Direct Labor + Overhead + Packaging.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);
const r2 = (v: Prisma.Decimal) => v.toDecimalPlaces(2).toNumber();
const r4 = (v: Prisma.Decimal) => v.toDecimalPlaces(4).toNumber();

/** Категории, които се броят за опаковка (§20 D) — по име. */
export const PACKAGING_CATEGORIES = new Set(["Опаковка", "Плик", "Кутия", "Стикер", "Hangtag"]);
export function isPackagingCategory(name: string | null | undefined): boolean {
  return !!name && PACKAGING_CATEGORIES.has(name);
}

/** Direct Labor = минути / 60 × часова ставка (§20 B). */
export function directLabor(minutes: number, hourlyRate: number): number {
  return r4(D(minutes).div(60).times(hourlyRate));
}

/** Overhead: фиксирана сума на брой ИЛИ процент върху труда (§20 C). */
export function overheadCost(method: string, value: number, labor: number): number {
  if (method === "percent_labor") return r4(D(labor).times(value).div(100));
  return r4(D(value)); // per_unit
}

export type ManufacturingInput = { directMaterials: number; packaging: number; labor: number; overhead: number };
/** Производствена себестойност/бр. */
export function manufacturingCost(m: ManufacturingInput): number {
  return r2(D(m.directMaterials).plus(m.packaging).plus(m.labor).plus(m.overhead));
}

export type Commercial = {
  marketing?: number; paymentFees?: number; fulfillment?: number; returnsAllowance?: number; logistics?: number; other?: number;
};
/** Сума на търговските алокации (§21). */
export function commercialTotal(c: Commercial): number {
  return r2(D(c.marketing ?? 0).plus(c.paymentFees ?? 0).plus(c.fulfillment ?? 0).plus(c.returnsAllowance ?? 0).plus(c.logistics ?? 0).plus(c.other ?? 0));
}
/** Fully Loaded Cost = производствена + търговски алокации (показват се отделно). */
export function fullyLoadedCost(manufacturing: number, c: Commercial): number {
  return r2(D(manufacturing).plus(commercialTotal(c)));
}

/**
 * Марж и надценка (§22):
 *   Gross Profit = Selling Price − Cost
 *   Gross Margin % = GP / Selling Price × 100
 *   Markup %      = GP / Cost × 100
 */
export function margins(sellingPrice: number, cost: number): { grossProfit: number; grossMarginPct: number; markupPct: number } {
  const gp = D(sellingPrice).minus(cost);
  return {
    grossProfit: r2(gp),
    grossMarginPct: sellingPrice > 0 ? r2(gp.div(sellingPrice).times(100)) : 0,
    markupPct: cost > 0 ? r2(gp.div(cost).times(100)) : 0,
  };
}
