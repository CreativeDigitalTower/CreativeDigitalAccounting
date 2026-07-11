// ─────────────────────────────────────────────────────────────────────────
// i18n конфигурация — добавянето на нов език изисква САМО:
//   1) вписване тук (locale + Intl locale + етикет/флаг)
//   2) папка src/locales/<code>/ с преводните файлове
// Без промяна по компонентите.
// ─────────────────────────────────────────────────────────────────────────

export const LOCALES = [
  { code: "bg", label: "BG", native: "Български", flag: "🇧🇬", intl: "bg-BG", og: "bg_BG" },
  { code: "en", label: "EN", native: "English", flag: "🇬🇧", intl: "en-US", og: "en_US" },
  { code: "ru", label: "RU", native: "Русский", flag: "🇷🇺", intl: "ru-RU", og: "ru_RU" },
  { code: "ro", label: "RO", native: "Română", flag: "🇷🇴", intl: "ro-RO", og: "ro_RO" },
  { code: "tr", label: "TR", native: "Türkçe", flag: "🇹🇷", intl: "tr-TR", og: "tr_TR" },
  { code: "el", label: "EL", native: "Ελληνικά", flag: "🇬🇷", intl: "el-GR", og: "el_GR" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "bg";
export const LOCALE_COOKIE = "cda_locale";
export const LOCALE_CODES = LOCALES.map((l) => l.code) as Locale[];

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALE_CODES as string[]).includes(v);
}
export function normalizeLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
export function localeMeta(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
export function intlLocale(code: Locale): string {
  return localeMeta(code).intl;
}
