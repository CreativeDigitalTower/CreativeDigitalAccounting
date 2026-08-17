/**
 * Чиста логика за кроене (Cutting Batch) — теоретичен срещу реален разход + остатъци.
 * Без DB, тестируемо изолирано (§11, §12, §13).
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Статуси на кроене и на остатъци. */
export const CUTTING_STATUSES = ["draft", "confirmed", "cancelled"] as const;
export type CuttingStatus = (typeof CUTTING_STATUSES)[number];
export const REMNANT_STATUSES = ["available", "reserved", "used", "waste"] as const;
export type RemnantStatus = (typeof REMNANT_STATUSES)[number];

export type CutLine = { size: string; quantity: number };

/** Общо скроени бройки = Σ количества по размер. */
export function cuttingTotalUnits(lines: CutLine[]): number {
  return lines.reduce((s, l) => s + (l.quantity || 0), 0);
}

/**
 * Теоретичен разход на плат = Σ (бройки за размер × BOM количество плат за този размер).
 * `resolveFabric(size)` връща метрите плат за 1 дреха от съответния размер (от BOM).
 */
export function expectedFabric(lines: CutLine[], resolveFabric: (size: string) => number): number {
  const total = lines.reduce<Prisma.Decimal>((s, l) => s.plus(D(l.quantity || 0).times(resolveFabric(l.size) || 0)), D(0));
  return total.toDecimalPlaces(3).toNumber();
}

/** Разлика теоретичен↔реален разход: абсолютна и в процент (спрямо теоретичния). */
export function fabricVariance(expected: number, actual: number): { diff: number; pct: number } {
  const diff = D(actual).minus(expected).toDecimalPlaces(3).toNumber();
  const pct = expected > 0 ? D(diff).div(expected).times(100).toDecimalPlaces(2).toNumber() : 0;
  return { diff, pct };
}
