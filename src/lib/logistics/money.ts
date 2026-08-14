/**
 * Decimal-safe финансова аритметика (изискване 13). Използва Prisma.Decimal (decimal.js
 * под капака) — БЕЗ JS floating-point за парични стойности. Съхранението остава Float
 * (както цялата платформа), но всяко изчисление минава през Decimal и се закръгля
 * детерминистично на ниво ред (както прави реалната Holcim фактура).
 */
import { Prisma } from "@prisma/client";

const D = Prisma.Decimal;
type Num = number | string;

/** Нето (без ДДС) = количество × единична цена, закръглено на 2 знака. */
export function netAmount(quantity: Num, unitPrice: Num): number {
  return new D(quantity).times(unitPrice).toDecimalPlaces(2).toNumber();
}

/** ДДС = нето × ставка/100, закръглено на 2 знака. Ставка null/невалидна → 0. */
export function vatAmount(net: Num, vatRate: Num | null | undefined): number {
  const rate = vatRate == null ? new D(0) : new D(vatRate);
  return new D(net).times(rate).dividedBy(100).toDecimalPlaces(2).toNumber();
}

/** Финансите на един ред: нето / ДДС / бруто (всичко 2 знака, per-line закръгляне). */
export function lineFinancials(quantity: Num, unitPrice: Num, vatRate: Num | null | undefined) {
  const net = netAmount(quantity, unitPrice);
  const vat = vatAmount(net, vatRate);
  const gross = new D(net).plus(vat).toDecimalPlaces(2).toNumber();
  return { net, vat, gross };
}

/** Точна сума на парични стойности (Decimal, 2 знака). Без float drift. */
export function sumMoney(values: Array<number | null | undefined>): number {
  let acc = new D(0);
  for (const v of values) if (v != null) acc = acc.plus(new D(String(v)));
  return acc.toDecimalPlaces(2).toNumber();
}

/** Дали две парични/количествени стойности се различават над допустимия толеранс. */
export function differsBeyond(a: Num | null | undefined, b: Num | null | undefined, tolerance = 0.01): boolean {
  if (a == null || b == null) return false;
  return new D(String(a)).minus(new D(String(b))).abs().greaterThan(tolerance);
}
