/**
 * Чиста логика за готова продукция (Finished Goods) — движения + наличност (§17).
 * Ниво Style + Color + Size. Без DB, тестируемо изолирано.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Типове движения на готовата продукция. */
export const FG_MOVEMENT_TYPES = [
  "PRODUCTION_OUTPUT", "SALE", "RESERVE", "UNRESERVE", "GIFT", "MARKETING", "SCRAP", "RETURN", "ADJUSTMENT",
] as const;
export type FgMovementType = (typeof FG_MOVEMENT_TYPES)[number];

type Spec = { dir: "in" | "out" | null; counter: "produced" | "sold" | "reserved" | "gifted" | "marketing" | "scrapped" | "returned" | null };

/** Спецификация на движение: посока + кой брояч се увеличава. ADJUSTMENT е с явна посока. */
export function fgMovementSpec(type: FgMovementType): Spec {
  switch (type) {
    case "PRODUCTION_OUTPUT": return { dir: "in", counter: "produced" };
    case "SALE": return { dir: "out", counter: "sold" };
    case "RESERVE": return { dir: "out", counter: "reserved" };
    case "UNRESERVE": return { dir: "in", counter: "reserved" }; // намалява резервираните
    case "GIFT": return { dir: "out", counter: "gifted" };
    case "MARKETING": return { dir: "out", counter: "marketing" };
    case "SCRAP": return { dir: "out", counter: "scrapped" };
    case "RETURN": return { dir: "in", counter: "returned" };
    case "ADJUSTMENT": return { dir: null, counter: null };
  }
}

/** Наличност след движение (посоката е in/out). */
export function fgAvailableAfter(available: number, direction: "in" | "out", quantity: number): number {
  return direction === "in" ? available + quantity : available - quantity;
}

/** Може ли да се извади това количество (без отрицателна наличност, освен allowNegative). */
export function canReduceFg(available: number, quantity: number, allowNegative: boolean): boolean {
  return allowNegative || available >= quantity;
}

/** Оставащи за прехвърляне в готова продукция бройки (не повече от готовите). */
export function receivableRemaining(qtyReady: number, qtyReceived: number): number {
  return Math.max(0, qtyReady - qtyReceived);
}

/** Стойност на наличността по себестойност + потенциален retail. */
export function fgStockValue(rows: { available: number; unitCost: number; retailPrice?: number | null }[]): { cost: number; retail: number } {
  const cost = rows.reduce<Prisma.Decimal>((s, r) => s.plus(D(r.available).times(r.unitCost)), D(0));
  const retail = rows.reduce<Prisma.Decimal>((s, r) => s.plus(D(r.available).times(r.retailPrice ?? 0)), D(0));
  return { cost: cost.toDecimalPlaces(2).toNumber(), retail: retail.toDecimalPlaces(2).toNumber() };
}
