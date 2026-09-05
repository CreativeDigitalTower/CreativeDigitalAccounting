/**
 * Централна логика за номерацията на документите (чисти функции — тествани изолирано).
 *
 * ROOT CAUSE на бъга: предишната логика взимаше „numeric core" чрез number.replace(/\D/g,"")
 * — т.е. премахваше ВСИЧКИ нецифрови знаци. За специална фактура „0002700175-1" това дава
 * „00027001751" → 27001751, което надви реалния максимум (2700183) и предложи 0027001752.
 *
 * Тук номерът се смята правилно: за автоматичната последователност се броят САМО РЕДОВНИ
 * номера (точен формат `<prefix><цифри>`); специалните номера със suffix (`-1`, `-A`, …) се
 * ИГНОРИРАТ и НЕ участват в изчислението (§8). Leading zeroes се запазват (§16).
 */

/** Регулярен ли е номерът за даден префикс: точно `<prefix>` + само цифри след него. */
export function isRegularNumber(number: string, prefix = ""): boolean {
  if (prefix && !number.startsWith(prefix)) return false;
  const rest = prefix ? number.slice(prefix.length) : number;
  return rest.length > 0 && /^\d+$/.test(rest);
}

/** Числовата стойност на РЕДОВЕН номер, или null за специален/чужд формат (§8). */
export function coreValue(number: string, prefix = ""): number | null {
  if (!isRegularNumber(number, prefix)) return null;
  const rest = prefix ? number.slice(prefix.length) : number;
  const n = parseInt(rest, 10);
  return isNaN(n) ? null : n;
}

/** Специален ли е номерът (не участва в автоматичната последователност). */
export function isSpecialNumber(number: string, prefix = ""): boolean {
  return coreValue(number, prefix) === null;
}

/** Форматира числова стойност обратно към номер със запазени leading zeroes (§16). */
export function formatInvoiceNumber(value: number, pad = 10, prefix = ""): string {
  return `${prefix}${String(value).padStart(pad, "0")}`;
}

/** Най-големият РЕДОВЕН номер сред подадените (0, ако няма редовни). Специалните се пропускат. */
export function maxRegularValue(numbers: string[], prefix = ""): number {
  let max = 0;
  for (const num of numbers) {
    const v = coreValue(num, prefix);
    if (v != null && v > max) max = v;
  }
  return max;
}

/**
 * Следваща числова стойност за автоматичен номер:
 *   - ако има изрично зададен override (Company.nextInvoiceNumber) → него (§11/§15);
 *   - иначе → max(startBase, най-голям редовен + 1). Специалните номера не влияят (§8).
 */
export function computeNextValue(
  numbers: string[],
  opts: { startBase?: number; override?: number | null; prefix?: string } = {},
): number {
  const { startBase = 1, override = null, prefix = "" } = opts;
  if (override != null) return override;
  return Math.max(startBase, maxRegularValue(numbers, prefix) + 1);
}

/**
 * Нова стойност на override след издаване на РЕДОВЕН номер (§14/§18): последователността
 * продължава от използвания +1. Специален номер → без промяна (връща текущия override).
 * Извиква се само когато има активен override; при derived режим не пазим стойност.
 */
export function advancedOverride(currentOverride: number, usedNumber: string, prefix = ""): number {
  const used = coreValue(usedNumber, prefix);
  if (used == null) return currentOverride; // специален номер не мърда последователността
  return Math.max(currentOverride, used + 1);
}
