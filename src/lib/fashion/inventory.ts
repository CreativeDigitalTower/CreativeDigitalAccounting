/**
 * Чиста складова логика за модул „Модно производство" (без DB → тестируемо изолирано).
 * Централен ledger: всяко движение е запис; текущите числа се извеждат от движенията.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Категории материали по подразбиране (§3). Чист списък (без DB) → тестируем. */
export const DEFAULT_MATERIAL_CATEGORIES: string[] = [
  "Плат", "Конец", "Ластик", "Цип", "Копче", "Подплата", "Подплънка", "Чашка", "Банел",
  "Кант", "Корда", "Стопер", "Кука", "Тик-так копче", "Бранд етикет", "Размерен етикет",
  "Етикет за състав", "Hangtag", "Декоративен елемент", "Опаковка", "Плик", "Кутия",
  "Стикер", "Друг",
];

/** Типове складови движения (§29). */
export const MOVEMENT_TYPES = [
  "PURCHASE", "MANUAL_IN", "MANUAL_OUT", "CUTTING_CONSUMPTION", "SAMPLE_CONSUMPTION",
  "PRODUCTION_OUTPUT", "SALE", "DEFECT", "SCRAP", "REWORK", "GIFT", "MARKETING",
  "STOCK_ADJUSTMENT", "RETURN",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Посока на движението (влиза/излиза от материалната наличност). */
const IN_TYPES = new Set<MovementType>(["PURCHASE", "MANUAL_IN", "RETURN"]);
const OUT_TYPES = new Set<MovementType>([
  "MANUAL_OUT", "CUTTING_CONSUMPTION", "SAMPLE_CONSUMPTION", "DEFECT", "SCRAP", "GIFT", "MARKETING",
]);
/** STOCK_ADJUSTMENT/PRODUCTION_OUTPUT/SALE/REWORK са контекстуални (посоката се подава явно). */
export function movementDirection(type: MovementType): "in" | "out" | null {
  if (IN_TYPES.has(type)) return "in";
  if (OUT_TYPES.has(type)) return "out";
  return null; // изисква явна посока
}

/** Закръгляне до 4 знака (за среднопретеглена цена) / 3 (за количества). */
export function round(value: number, dp = 4): number {
  return D(value).toDecimalPlaces(dp).toNumber();
}

/**
 * Среднопретеглена покупна цена след входящо количество.
 * newAvg = (curQty*curAvg + addQty*addUnitCost) / (curQty + addQty)
 * Пример: (100·14.80 + 80·15.40)/180 = 15.0666… → 15.0667
 */
export function weightedAverage(curQty: number, curAvg: number, addQty: number, addUnitCost: number): number {
  const cq = D(curQty), aq = D(addQty);
  const total = cq.plus(aq);
  if (total.lte(0)) return round(addUnitCost);
  if (aq.lte(0)) return round(curAvg);
  const value = cq.times(curAvg).plus(aq.times(addUnitCost));
  return round(value.div(total).toNumber());
}

export type DeliveryLineInput = { materialId: string; quantity: number; unit: string; unitPrice: number };
export type AllocatedLine = DeliveryLineInput & { lineTotal: number; allocatedExtra: number; landedUnitCost: number };

/**
 * Разпределя транспортни + допълнителни разходи пропорционално по стойност на реда
 * (landed cost). Ако общата стойност е 0 → без разпределение.
 */
export function allocateLandedCosts(lines: DeliveryLineInput[], extraTotal: number): AllocatedLine[] {
  const totals = lines.map((l) => D(l.quantity).times(l.unitPrice));
  const grand = totals.reduce((s, t) => s.plus(t), D(0));
  const extra = D(extraTotal);
  return lines.map((l, i) => {
    const lineTotal = totals[i];
    const share = grand.gt(0) ? extra.times(lineTotal).div(grand) : D(0);
    const qty = D(l.quantity);
    const landedUnitCost = qty.gt(0) ? lineTotal.plus(share).div(qty) : D(l.unitPrice);
    return {
      ...l,
      lineTotal: round(lineTotal.toNumber(), 2),
      allocatedExtra: round(share.toNumber(), 2),
      landedUnitCost: round(landedUnitCost.toNumber(), 4),
    };
  });
}

/** Нова наличност след движение (никога под 0, ако allowNegative=false). */
export function applyMovement(currentQty: number, direction: "in" | "out", quantity: number): number {
  const delta = direction === "in" ? D(quantity) : D(quantity).neg();
  return round(D(currentQty).plus(delta).toNumber(), 3);
}

/** Дали движение „out" е допустимо при текуща наличност (без отрицателна наличност). */
export function canConsume(currentQty: number, quantity: number, allowNegative: boolean): boolean {
  if (allowNegative) return true;
  return D(currentQty).gte(quantity);
}
