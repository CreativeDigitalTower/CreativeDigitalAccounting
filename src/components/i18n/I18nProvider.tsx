"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { makeT, type Messages, type TFunc } from "@/lib/i18n/messages";
import { fmtMoney, fmtNumber, fmtPercent, fmtDate, fmtDateShort } from "@/lib/i18n/format";

type Ctx = {
  locale: Locale;
  t: TFunc;
  /** Суровите съобщения за текущия език — за четене на масиви/обекти в client компоненти. */
  messages: Messages;
  money: (v: number, currency?: string) => string;
  num: (v: number, opts?: Intl.NumberFormatOptions) => string;
  percent: (v: number, digits?: number) => string;
  date: (v: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  dateShort: (v: Date | string | number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const t = makeT(messages);
    return {
      locale, t, messages,
      money: (v, c) => fmtMoney(v, locale, c),
      num: (v, o) => fmtNumber(v, locale, o),
      percent: (v, d) => fmtPercent(v, locale, d),
      date: (v, o) => fmtDate(v, locale, o),
      dateShort: (v) => fmtDateShort(v, locale),
    };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n трябва да се ползва в <I18nProvider>");
  return ctx;
}
/** Кратък помощник: `const t = useT()`. */
export function useT(): TFunc {
  return useI18n().t;
}
