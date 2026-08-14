/**
 * Нормализиране за dedup и alias resolution (чисти функции → тествани изолирано).
 *
 * Целта е формати като „CB 0638 AT", „cb-0638-at", „CB0638AT" да сочат към един
 * автомобил; и „42,5" ↔ „42.5", „CEM II / A-LL 52.5 N" ↔ „CEM II A-LL 52.5 N" към
 * един продукт — БЕЗ агресивно fuzzy matching, което би смесило A-LL / B-LL / B-V.
 */

/**
 * Нормализира регистрационен номер: главни букви, само букви и цифри (маха
 * интервали, тирета, точки и др.). „CB 0638 AT" / „cb-0638-at" → „CB0638AT".
 */
export function normalizeRegistration(input: string | null | undefined): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Нормализира продуктово име/alias за точно съпоставяне: главни букви, десетична
 * запетая → точка (42,5 → 42.5), маха интервали и „/" (форматиращи разлики).
 * ЗАПАЗВА буквите (вкл. тиретата чрез премахване, така A-LL→ALL, B-LL→BLL остават
 * различни) → НЕ смесва различни класове цимент.
 */
export function normalizeProductKey(input: string | null | undefined): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/,/g, ".")      // десетична запетая → точка
    .replace(/\s+/g, "")     // маха всички интервали
    .replace(/\//g, "")      // маха „/" (CEM II / A-LL → CEM IIA-LL)
    .replace(/-/g, "");      // маха тирета (A-LL → ALL, но ALL ≠ BLL ≠ BV)
}

/** Нормализира Holcim material code (само цифри/букви, главни). */
export function normalizeMaterialCode(input: string | null | undefined): string {
  return (input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
