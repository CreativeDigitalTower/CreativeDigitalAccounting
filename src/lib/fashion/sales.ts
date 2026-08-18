/**
 * Чиста логика за месечни отчети за продажби (§18) — без DB, тестируемо изолирано.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);
const r2 = (v: Prisma.Decimal) => v.toDecimalPlaces(2).toNumber();

export const SALES_STATUSES = ["draft", "finalized"] as const;
export type SalesStatus = (typeof SALES_STATUSES)[number];

/** Валиден ли е периодът (YYYY-MM). */
export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/** Приход на ред = количество × цена − отстъпка (не под 0). */
export function lineRevenue(quantity: number, price: number, discount = 0): number {
  const gross = D(quantity).times(price).minus(discount);
  return r2(gross.lt(0) ? D(0) : gross);
}

/** COGS на ред = количество × себестойност (snapshot при приключване). */
export function lineCogs(quantity: number, unitCost: number): number {
  return r2(D(quantity).times(unitCost));
}

export type SalesLineLike = { quantity: number; price: number; discount?: number; unitCost: number };

/** Обобщения на отчета: приход, COGS, брутна печалба, брой продадени. */
export function salesTotals(lines: SalesLineLike[]): { revenue: number; cogs: number; grossProfit: number; units: number } {
  let revenue = D(0), cogs = D(0), units = 0;
  for (const l of lines) {
    revenue = revenue.plus(lineRevenue(l.quantity, l.price, l.discount ?? 0));
    cogs = cogs.plus(lineCogs(l.quantity, l.unitCost));
    units += l.quantity;
  }
  return { revenue: r2(revenue), cogs: r2(cogs), grossProfit: r2(revenue.minus(cogs)), units };
}

/** Брутен марж % на отчета. */
export function reportGrossMarginPct(revenue: number, grossProfit: number): number {
  return revenue > 0 ? r2(D(grossProfit).div(revenue).times(100)) : 0;
}
