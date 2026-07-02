/**
 * Централна валидация на български ЕИК / БУЛСТАT.
 *
 * ВАЖНО: Тук НЯМА външно API (Търговски регистър / APIS.bg). Проверката е
 * само локална — формат, дължина и контролна цифра по официалния алгоритъм.
 * Логиката е нарочно изолирана в този helper, за да може в бъдеще да се добави
 * онлайн проверка (напр. в `validateEik`) БЕЗ да се пренаписва останалият код.
 *
 * Алгоритъм за контролна цифра (БУЛСТAT / ЕИК):
 *
 * 9-цифрен ЕИК (юридически лица):
 *   1) Сумираме първите 8 цифри с тегла [1,2,3,4,5,6,7,8] и взимаме остатъка при
 *      деление на 11.
 *   2) Ако остатъкът е < 10 → това е контролната цифра (9-та).
 *   3) Ако остатъкът е 10 → повтаряме сумирането с тегла [3,4,5,6,7,8,9,10],
 *      взимаме остатъка при деление на 11; ако той е 10 → контролната цифра е 0,
 *      иначе е самият остатък.
 *
 * 13-цифрен БУЛСTAT (клонове / поделения):
 *   Първите 9 цифри трябва да са валиден 9-цифрен ЕИК (виж по-горе), след което
 *   13-та цифра се проверява по цифри 9–12 (индекси 8–11) с тегла:
 *     първи опит [2,7,3,5], при остатък 10 → втори опит [4,9,5,7]
 *     (при остатък 10 и там → контролната цифра е 0).
 */

export type EikValidationResult = {
  isValid: boolean;
  normalized: string;
  error?: string;
};

/** Нормализира вход: маха интервали, тирета, точки; оставя само цифри (като string). */
export function normalizeEik(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/[\s.\-]/g, "");
}

/** Контролна цифра за 9-цифрения (или първите 9 цифри на 13-цифрен) ЕИК. */
function isValid9(digits: string): boolean {
  const d = digits.split("").map(Number);
  const weights1 = [1, 2, 3, 4, 5, 6, 7, 8];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += weights1[i] * d[i];
  let remainder = sum % 11;

  if (remainder === 10) {
    const weights2 = [3, 4, 5, 6, 7, 8, 9, 10];
    sum = 0;
    for (let i = 0; i < 8; i++) sum += weights2[i] * d[i];
    remainder = sum % 11;
    if (remainder === 10) remainder = 0; // особен случай → контролна цифра 0
  }
  return remainder === d[8];
}

/** Контролна цифра за 13-цифрен БУЛСTAT (проверява 13-та по цифри 9–12). */
function isValid13(digits: string): boolean {
  if (!isValid9(digits.slice(0, 9))) return false;
  const d = digits.split("").map(Number);
  const weights1 = [2, 7, 3, 5];
  const weights2 = [4, 9, 5, 7];
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += weights1[i] * d[8 + i];
  let remainder = sum % 11;

  if (remainder === 10) {
    sum = 0;
    for (let i = 0; i < 4; i++) sum += weights2[i] * d[8 + i];
    remainder = sum % 11;
    if (remainder === 10) remainder = 0;
  }
  return remainder === d[12];
}

/**
 * Основна проверка. Връща { isValid, normalized, error? }.
 * `required` = дали празна стойност е грешка (по подразбиране true).
 */
export function validateEik(input: string | null | undefined, opts: { required?: boolean } = {}): EikValidationResult {
  const required = opts.required ?? true;
  const normalized = normalizeEik(input);

  if (!normalized) {
    return required
      ? { isValid: false, normalized, error: "ЕИК/БУЛСТАТ е задължителен." }
      : { isValid: true, normalized };
  }
  if (!/^\d+$/.test(normalized)) {
    return { isValid: false, normalized, error: "ЕИК/БУЛСТАТ трябва да съдържа само цифри." };
  }
  if (normalized.length !== 9 && normalized.length !== 13) {
    return { isValid: false, normalized, error: "ЕИК/БУЛСТАТ трябва да съдържа 9 или 13 цифри." };
  }
  const ok = normalized.length === 9 ? isValid9(normalized) : isValid13(normalized);
  if (!ok) {
    return { isValid: false, normalized, error: "Въведеният ЕИК/БУЛСТАТ е невалиден." };
  }
  return { isValid: true, normalized };
}

/**
 * Помощна функция за тестове/сийдване: изчислява валидна контролна цифра за
 * подадени първи 8 цифри (9-цифрен ЕИК). Използва се и в eik.test.ts.
 */
export function computeCheckDigit9(first8: string): number {
  const d = first8.split("").map(Number);
  const weights1 = [1, 2, 3, 4, 5, 6, 7, 8];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += weights1[i] * d[i];
  let remainder = sum % 11;
  if (remainder === 10) {
    const weights2 = [3, 4, 5, 6, 7, 8, 9, 10];
    sum = 0;
    for (let i = 0; i < 8; i++) sum += weights2[i] * d[i];
    remainder = sum % 11;
    if (remainder === 10) remainder = 0;
  }
  return remainder;
}

/** Аналогично — 13-та контролна цифра за подадени първи 12 цифри. */
export function computeCheckDigit13(first12: string): number {
  const d = first12.split("").map(Number);
  const weights1 = [2, 7, 3, 5];
  const weights2 = [4, 9, 5, 7];
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += weights1[i] * d[8 + i];
  let remainder = sum % 11;
  if (remainder === 10) {
    sum = 0;
    for (let i = 0; i < 4; i++) sum += weights2[i] * d[8 + i];
    remainder = sum % 11;
    if (remainder === 10) remainder = 0;
  }
  return remainder;
}
