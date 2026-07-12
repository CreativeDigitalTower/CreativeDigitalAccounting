import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

// Регистър на преводните пространства (namespaces). Добавяне на нов namespace =
// нов JSON файл за всеки език + нов ред тук. Добавяне на нов език = нов блок.
import bgCommon from "@/locales/bg/common.json";
import bgNav from "@/locales/bg/navigation.json";
import bgAuth from "@/locales/bg/auth.json";
import enCommon from "@/locales/en/common.json";
import enNav from "@/locales/en/navigation.json";
import enAuth from "@/locales/en/auth.json";
import ruCommon from "@/locales/ru/common.json";
import ruNav from "@/locales/ru/navigation.json";
import ruAuth from "@/locales/ru/auth.json";
import roCommon from "@/locales/ro/common.json";
import roNav from "@/locales/ro/navigation.json";
import roAuth from "@/locales/ro/auth.json";
import trCommon from "@/locales/tr/common.json";
import trNav from "@/locales/tr/navigation.json";
import trAuth from "@/locales/tr/auth.json";
import elCommon from "@/locales/el/common.json";
import elNav from "@/locales/el/navigation.json";
import elAuth from "@/locales/el/auth.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Messages = Record<string, any>;

const DICTS: Record<Locale, Messages> = {
  bg: { common: bgCommon, navigation: bgNav, auth: bgAuth },
  en: { common: enCommon, navigation: enNav, auth: enAuth },
  ru: { common: ruCommon, navigation: ruNav, auth: ruAuth },
  ro: { common: roCommon, navigation: roNav, auth: roAuth },
  tr: { common: trCommon, navigation: trNav, auth: trAuth },
  el: { common: elCommon, navigation: elNav, auth: elAuth },
};

// Дълбоко сливане: липсващ ключ пада обратно към българския (никога raw key на екрана).
function deepMerge(base: Messages, over: Messages): Messages {
  const out: Messages = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(over ?? {})) {
    const b = out[k], o = over[k];
    out[k] = b && o && typeof b === "object" && typeof o === "object" && !Array.isArray(b) ? deepMerge(b, o) : o;
  }
  return out;
}

const CACHE = new Map<Locale, Messages>();

export function getMessages(locale: Locale): Messages {
  if (CACHE.has(locale)) return CACHE.get(locale)!;
  const merged = locale === DEFAULT_LOCALE ? DICTS[DEFAULT_LOCALE] : deepMerge(DICTS[DEFAULT_LOCALE], DICTS[locale] ?? {});
  CACHE.set(locale, merged);
  return merged;
}

/** Резолвва ключ „namespace.path.to.key" + интерполация на {променливи}. */
export function translate(messages: Messages, key: string, vars?: Record<string, string | number>): string {
  const val = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Messages)[k] : undefined), messages);
  let s = typeof val === "string" ? val : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  if (process.env.NODE_ENV !== "production" && typeof val !== "string") console.warn(`[i18n] Липсва ключ: ${key}`);
  return s;
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;
export function makeT(messages: Messages): TFunc {
  return (key, vars) => translate(messages, key, vars);
}
