/**
 * Чиста логика за BOM (рецепта на продукта) — без DB, тестируемо изолирано (§7, §8).
 * Базово количество на материал за 1 бройка + overrides по размер/цвят/вариант.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

export type BomOverride = { size?: string | null; color?: string | null; quantity: number };

// „Празно" (null или "") = wildcard/липсва стойност.
const has = (v?: string | null) => v != null && v !== "";
const eq = (a?: string | null, b?: string | null) => (a ?? "") === (b ?? "");

/**
 * Резолвира количеството за конкретен (размер, цвят) с приоритет:
 *   1) точен (size + color)  2) само size  3) само color  4) базово.
 * Ако няма override → базовото количество.
 */
export function resolveQuantity(baseQty: number, overrides: BomOverride[], size?: string | null, color?: string | null): number {
  const exact = overrides.find((o) => has(o.size) && has(o.color) && eq(o.size, size) && eq(o.color, color));
  if (exact) return exact.quantity;
  const bySize = has(size) ? overrides.find((o) => has(o.size) && !has(o.color) && eq(o.size, size)) : undefined;
  if (bySize) return bySize.quantity;
  const byColor = has(color) ? overrides.find((o) => has(o.color) && !has(o.size) && eq(o.color, color)) : undefined;
  if (byColor) return byColor.quantity;
  return baseQty;
}

export type BomLineInput = {
  materialId: string;
  baseQuantity: number;
  unit: string;
  unitCost: number; // среднопретеглена цена на материала
  overrides: BomOverride[];
};
export type BomLineBreakdown = BomLineInput & { resolvedQuantity: number; lineCost: number };

/** Разбивка на BOM за конкретен (размер, цвят): резолвирано количество + стойност на ред. */
export function bomBreakdown(lines: BomLineInput[], size?: string | null, color?: string | null): BomLineBreakdown[] {
  return lines.map((l) => {
    const resolvedQuantity = resolveQuantity(l.baseQuantity, l.overrides, size, color);
    const lineCost = D(resolvedQuantity).times(l.unitCost).toDecimalPlaces(4).toNumber();
    return { ...l, resolvedQuantity, lineCost };
  });
}

/** Материална себестойност на 1 бройка = Σ (резолвирано количество × ед. цена), 4 знака. */
export function bomMaterialCost(lines: BomLineInput[], size?: string | null, color?: string | null): number {
  const total = bomBreakdown(lines, size, color).reduce<Prisma.Decimal>((s, l) => s.plus(l.lineCost), D(0));
  return total.toDecimalPlaces(4).toNumber();
}
