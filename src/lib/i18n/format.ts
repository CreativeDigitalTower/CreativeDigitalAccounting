import { intlLocale, type Locale } from "./config";

// Локализирано форматиране (Intl). НЕ променя реалните стойности в базата.

export function fmtMoney(value: number, locale: Locale, currency = "EUR"): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}
export function fmtNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value || 0);
}

// Мерни КОЛИЧЕСТВА винаги с точно 3 знака след десетичния разделител (изискване на
// клиента за счетоводството). Разделителят следва locale (BG „,“ / EN „.“), но
// precision е винаги 3. НЕ променя реалната стойност — само визуализацията.
export const QUANTITY_FRACTION_DIGITS = 3;
export function fmtQuantity(value: number | null | undefined, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: QUANTITY_FRACTION_DIGITS,
    maximumFractionDigits: QUANTITY_FRACTION_DIGITS,
  }).format(Number(value) || 0);
}
/** Количество + мерна единица: „26,500 t“. */
export function fmtQuantityUnit(value: number | null | undefined, unit: string | null | undefined, locale: Locale): string {
  return `${fmtQuantity(value, locale)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Разбира въведено количество с точка ИЛИ запетая като десетичен разделител
 * („28“, „28,5“, „28.500“, „28,250“). Ако има и двете, запетаята се третира като
 * разделител на хиляди. Връща null при невалиден вход (не 0 — за да се различи).
 */
export function parseQuantity(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const s = input.trim().replace(/\s/g, "");
  if (!s) return null;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  let norm: string;
  if (hasComma && hasDot) norm = s.replace(/,/g, "");           // 1,234.5 → 1234.5
  else if (hasComma) norm = s.replace(/,/g, ".");               // 28,5 → 28.5
  else norm = s;
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
export function fmtPercent(value: number, locale: Locale, fractionDigits = 1): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: fractionDigits }).format((value || 0) / 100);
}
export function fmtDate(value: Date | string | number, locale: Locale, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }): string {
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(new Date(value));
}
export function fmtDateShort(value: Date | string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
