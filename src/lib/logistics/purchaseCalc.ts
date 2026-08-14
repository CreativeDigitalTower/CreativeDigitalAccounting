/**
 * Чисти изчисления за покупната страна (Holcim фактури + проформи). Тествани.
 * Нищо не е hardcode: ДДС ставката идва отвън (от фактурата), не е фиксирана.
 * Паричните изчисления минават през decimal-safe helpers (money.ts), не през float.
 */
import { netAmount, lineFinancials, sumMoney } from "@/lib/logistics/money";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Ред от фактура: нето без ДДС = количество × единична цена (26.140 × 70 = 1829.80). */
export function lineTotal(quantity: number, unitPrice: number): number {
  if (!(quantity >= 0) || !(unitPrice >= 0)) return 0;
  return netAmount(quantity, unitPrice);
}

export type InvoiceLineInput = { quantity: number; unitPrice: number; vatRate?: number | null };

/**
 * Тотали на фактурата от редовете: per-line закръгляне на нето/ДДС/бруто (както
 * реалната фактура), после точна Decimal сума. `vatRate` е default за редове без
 * собствена ставка. Данъчна основа = Σ нето, ДДС = Σ line-VAT, общо = Σ бруто.
 */
export function invoiceTotals(lines: InvoiceLineInput[], vatRate: number | null | undefined) {
  const rate = vatRate != null && vatRate >= 0 ? vatRate : 0;
  const per = lines.map((l) => lineFinancials(l.quantity, l.unitPrice, l.vatRate ?? rate));
  const base = sumMoney(per.map((p) => p.net));
  const vat = sumMoney(per.map((p) => p.vat));
  const total = sumMoney(per.map((p) => p.gross));
  return { base, vat, total, vatRate: rate };
}

export type ProformaStatus = "active" | "closed" | "cancelled";

/** Състояние на проформа: договорено / изразходвано / остатък (изразходваното е Σ алокации). */
export function proformaBalance(initialQuantity: number, allocatedQuantities: number[]) {
  const used = round3(allocatedQuantities.reduce((s, q) => s + (q > 0 ? q : 0), 0));
  const remaining = round3(initialQuantity - used);
  return { initial: round3(initialQuantity), used, remaining, negative: remaining < 0 };
}

/**
 * Проверява дали ново приспадане от `qty` е допустимо без явно потвърждение.
 * Ако остатъкът би станал отрицателен → изисква override (force).
 */
export function canAllocate(initialQuantity: number, allocatedQuantities: number[], qty: number): { ok: boolean; remainingAfter: number } {
  const { remaining } = proformaBalance(initialQuantity, allocatedQuantities);
  const remainingAfter = round3(remaining - qty);
  return { ok: remainingAfter >= 0, remainingAfter };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
