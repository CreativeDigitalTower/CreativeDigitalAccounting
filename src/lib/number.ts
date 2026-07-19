// ─────────────────────────────────────────────────────────────────────────
// Централна обработка на числови стойности (локализирано въвеждане).
//
// Единна логика за целия проект: разпознава десетичен разделител "," и ".",
// интервал/апостроф като разделител на хиляди, и връща НОРМАЛИЗИРАНА числова
// стойност. Използвайте я навсякъде вместо parseFloat()/Number() върху
// потребителски вход (форми, FormData, API, калкулации).
//
// Вътрешно всичко се съхранява като JS number (десетичен разделител ".").
// Форматирането за показване минава през Intl (formatLocalizedNumber).
// ─────────────────────────────────────────────────────────────────────────

import { intlLocale, type Locale } from "@/lib/i18n/config";

/** Символи, третирани като разделител на хиляди/шум и премахвани преди парсване. */
const GROUPING_CHARS = /[\s   ']/g;

/**
 * Разпознава число, въведено с "," или "." като десетичен разделител, както и
 * интервал/апостроф като разделител на хиляди. Връща нормализирано `number`,
 * или `null`, ако входът е невалиден/празен.
 *
 * Приема: "1234,56", "1234.56", "1 234,56", "1 234.56", "1.234,56",
 *         "1,234.56", "1234", "0,25", "-12,5".
 * Отхвърля: "1,,2", "1..2", "1,2.3", "1.2,3", "..", ",,", букви, невалидни групи.
 */
export function parseLocalizedNumber(input: unknown): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  let s = input.trim().replace(/−/g, "-"); // unicode minus → ASCII
  if (s === "") return null;
  s = s.replace(GROUPING_CHARS, "");
  if (s === "") return null;

  // Знак
  let sign = 1;
  if (s[0] === "+") s = s.slice(1);
  else if (s[0] === "-") { sign = -1; s = s.slice(1); }
  if (s === "") return null;

  // Само цифри и разделители
  if (!/^[\d.,]+$/.test(s)) return null;

  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;

  let decimalSep: "," | "." | null = null;
  let thousandsSep: "," | "." | null = null;

  if (commas > 0 && dots > 0) {
    // Последният срещнат разделител е десетичният; другият е за хиляди.
    decimalSep = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    thousandsSep = decimalSep === "," ? "." : ",";
  } else if (commas > 0) {
    if (commas === 1) decimalSep = ","; else thousandsSep = ",";
  } else if (dots > 0) {
    if (dots === 1) decimalSep = "."; else thousandsSep = ".";
  }

  // Раздели на цяла и дробна част
  let intRaw = s;
  let decPart = "";
  if (decimalSep) {
    const parts = s.split(decimalSep);
    if (parts.length !== 2) return null;
    intRaw = parts[0];
    decPart = parts[1];
    if (!/^\d+$/.test(decPart)) return null; // празна/невалидна дробна част
  }

  // Валидирай цялата част (и групирането по хиляди, ако има)
  let intPart: string;
  if (thousandsSep) {
    const groups = intRaw.split(thousandsSep);
    if (groups.length < 2) return null;
    if (!/^\d{1,3}$/.test(groups[0])) return null;
    for (let i = 1; i < groups.length; i++) if (!/^\d{3}$/.test(groups[i])) return null;
    intPart = groups.join("");
  } else {
    if (intRaw === "" && decPart !== "") intPart = "0"; // напр. ",5" → 0.5
    else if (!/^\d+$/.test(intRaw)) return null;
    else intPart = intRaw;
  }

  const num = Number(decPart ? `${intPart}.${decPart}` : intPart);
  return Number.isFinite(num) ? sign * num : null;
}

/** Дали входът е валидно число (празното НЕ е валидно). */
export function isValidNumberInput(input: unknown): boolean {
  return parseLocalizedNumber(input) !== null;
}

/**
 * Парсва вход, но връща `fallback` (по подразбиране 0) при невалиден/празен вход.
 * Удобно за калкулации, където NaN не е допустим.
 */
export function toNumber(input: unknown, fallback = 0): number {
  const n = parseLocalizedNumber(input);
  return n == null ? fallback : n;
}

/** Каноничен string ("." десетичен, без групиране) от произволен вход, или "". */
export function toCanonicalString(input: unknown): string {
  const n = parseLocalizedNumber(input);
  return n == null ? "" : String(n);
}

/** Локализирано форматиране за показване (Intl). */
export function formatLocalizedNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(Number.isFinite(value) ? value : 0);
}

/** Десетичният разделител за даден locale (за режим на редактиране в полето). */
export function decimalSeparator(locale: Locale): string {
  const parts = new Intl.NumberFormat(intlLocale(locale)).formatToParts(1.1);
  return parts.find((p) => p.type === "decimal")?.value ?? ".";
}

/**
 * Представяне на стойност за РЕДАКТИРАНЕ в поле — локализиран десетичен
 * разделител, но БЕЗ групиране на хиляди (за да се въвежда лесно и парсва пак).
 */
export function toEditableString(value: number | null | undefined, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return "";
  const sep = decimalSeparator(locale);
  return String(value).replace(".", sep);
}
