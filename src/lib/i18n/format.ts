import { intlLocale, type Locale } from "./config";

// Локализирано форматиране (Intl). НЕ променя реалните стойности в базата.

export function fmtMoney(value: number, locale: Locale, currency = "EUR"): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}
export function fmtNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value || 0);
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
