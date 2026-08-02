/**
 * Централна валидация/нормализация на ДДС номер (VAT).
 *
 * Няма външно API (VIES) — проверката е локална: държавен префикс + формат, а за
 * България и контролната цифра на ЕИК/ЕГН чрез съществуващия `validateEik`.
 * Изолирано тук, за да може по-късно да се добави онлайн VIES проверка без
 * пренаписване на останалия код.
 */
import { validateEik } from "./eik";

/** ЕС държавни префикси за ДДС (вкл. EL за Гърция и XI за Северна Ирландия). */
const EU_VAT_PREFIX = /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|EL|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE|XI)/;

/** Нормализира ДДС номер: главни букви, без интервали/тирета. */
export function normalizeVat(raw?: string | null): string {
  return (raw ?? "").toUpperCase().replace(/[\s.-]/g, "").trim();
}

/**
 * Базова валидация на формата на ДДС номер.
 * - България: BG + валиден ЕИК (9/13 цифри) ИЛИ 10-цифрен ЕГН.
 * - Останалите ЕС държави: префикс + 2–12 буквено-цифрени знака.
 * Не проверява реалната регистрация (за това е нужен VIES).
 */
export function isValidVat(raw?: string | null): boolean {
  const v = normalizeVat(raw);
  if (!v) return false;
  const m = v.match(EU_VAT_PREFIX);
  if (!m) return false;
  const prefix = m[1];
  const rest = v.slice(prefix.length);
  if (prefix === "BG") {
    if (/^\d{10}$/.test(rest)) return true; // ЕГН (физическо лице по ЗДДС)
    return validateEik(rest).isValid;       // ЕИК/БУЛСТАТ с контролна цифра
  }
  return /^[A-Z0-9]{2,12}$/.test(rest);
}

/**
 * Извежда статуса „регистриран по ЗДДС" за клиент по приоритет:
 *   1) изрично записан булев статус (ако моделът има такъв в бъдеще);
 *   2) валиден ДДС номер → регистриран;
 *   3) иначе → нерегистриран.
 */
export function deriveVatRegistered(c: { vatRegistered?: boolean | null; vatNumber?: string | null }): boolean {
  if (typeof c.vatRegistered === "boolean") return c.vatRegistered;
  return isValidVat(c.vatNumber);
}
