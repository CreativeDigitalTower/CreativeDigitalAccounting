"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { makeT, type Messages, type TFunc } from "@/lib/i18n/messages";
import { fmtMoney, fmtNumber, fmtPercent, fmtDate, fmtDateShort, fmtQuantity, fmtQuantityUnit } from "@/lib/i18n/format";

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
  /** Мерно КОЛИЧЕСТВО — винаги 3 знака след десетичния разделител (locale-aware). */
  qty: (v: number | null | undefined) => string;
  /** Количество + мерна единица: „26,500 t“. */
  qtyUnit: (v: number | null | undefined, unit: string | null | undefined) => string;
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
      qty: (v) => fmtQuantity(v, locale),
      qtyUnit: (v, u) => fmtQuantityUnit(v, u, locale),
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
