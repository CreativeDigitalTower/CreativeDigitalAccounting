export const EUR_TO_BGN = 1.95583;
export const DUAL_CURRENCY_UNTIL = new Date("2026-08-08");
export const FREE_PLAN_LIMIT = 5; // документа/месец

export const VAT_RATES = [0, 9, 20] as const;

export const DOC_PREFIXES: Record<string, string> = {
  invoice: "CDA",
  proforma: "PRO",
  quote: "ОФ",
  credit_note: "КИ",
  debit_note: "ДИ",
};

export const SUBSCRIPTION_PLANS = {
  free: { name: "Безплатен", price: 0, docsPerMonth: 5 },
  start: { name: "Старт", price: 19, docsPerMonth: 50 },
  business: { name: "Бизнес", price: 49, docsPerMonth: 200 },
  pro: { name: "Про", price: 99, docsPerMonth: Infinity },
} as const;

export function isDualCurrencyActive(): boolean {
  return new Date() < DUAL_CURRENCY_UNTIL;
}

export function toBGN(eur: number): number {
  return Math.round(eur * EUR_TO_BGN * 100) / 100;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("bg-BG").format(new Date(date));
}

export function getYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
