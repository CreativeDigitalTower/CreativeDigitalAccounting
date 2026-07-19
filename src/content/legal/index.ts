import type { Locale } from "@/lib/i18n/config";
import type { LegalSection } from "@/components/marketing/LegalDoc";

// ─────────────────────────────────────────────────────────────────────────
// Архитектура на правните страници (Legal).
//
// Всяка страница дефинира българската си версия (BG) inline в маршрута — тя е
// официалната базова версия и служи за fallback. Преводите на другите езици
// (и в бъдеще — отделни версии по ДЪРЖАВА) се вписват в регистъра по-долу като
// ДАННИ, без промяна по маршрута на страницата.
//
// Ключ: page id → locale → съдържание. За версии по държава ключът може да се
// разшири до `${locale}` / `${country}` (виж pickLegal).
// ─────────────────────────────────────────────────────────────────────────

export type { LegalSection };
export type LegalContent = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  sections: LegalSection[];
};

/** Регистър с преводи. bg НЕ се вписва тук — тя е inline в страницата (fallback). */
export const legalTranslations: Partial<Record<string, Partial<Record<Locale, LegalContent>>>> = {
  // Пример за бъдещо добавяне (без промяна по кода на страницата):
  // cookies: { en: { metaTitle: "…", metaDescription: "…", title: "…", sections: [...] } },
};

/**
 * Връща съдържанието за страница на избрания език (в бъдеще и държава), с
 * fallback към българската базова версия, ако липсва превод.
 */
export function pickLegal(page: string, locale: Locale, bg: LegalContent, country?: string): LegalContent {
  const byPage = legalTranslations[page];
  if (!byPage) return bg;
  // Приоритет: bg винаги е официална → ако езикът е bg, връщаме базовата версия.
  if (locale === "bg") return bg;
  // Бъдещо: версия по държава (напр. ключ "en-RO"), после само по език.
  if (country) {
    const byCountry = byPage[`${locale}-${country}` as Locale];
    if (byCountry) return byCountry;
  }
  return byPage[locale] ?? bg;
}
