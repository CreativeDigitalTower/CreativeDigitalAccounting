export const EUR_TO_BGN = 1.95583;
export const DUAL_CURRENCY_UNTIL = new Date("2026-08-08");
export const FREE_PLAN_LIMIT = 5; // документа/месец

export const COMPANY_NAME = "Криейтив Диджитъл Тауър ЕООД";
export const COMPANY_EIK = "205748188";
export const COMPANY_WEBSITE = "https://creativedigitaltower.com/";
export const COMPANY_EMAIL = "office@creativedigitaltower.com";
export const FACEBOOK_PAGE = "https://www.facebook.com/CreativeDigitalAccounting";
export const FACEBOOK_PAGE_ID = "CreativeDigitalAccounting";

// Банкови данни за абонаменти (само банков превод засега)
export const BANK_DETAILS = {
  recipient: "Криейтив Диджитъл Тауър ЕООД",
  iban: "BG84STSA93000028480494",
  bank: "Банка ДСК",
  reason: "Абонамент Creative Digital Accounting — избран пакет",
};

export const VAT_RATES = [0, 9, 20] as const;

export const DOC_PREFIXES: Record<string, string> = {
  invoice: "", // фактурите са с чисто число: 0000000001
  proforma: "PF-",
  quote: "OF-",
  credit_note: "KI-",
  debit_note: "DI-",
};

// Поддържани валути за фактуриране
export const CURRENCIES = [
  { code: "EUR", label: "Евро (€)", symbol: "€" },
  { code: "BGN", label: "Лев (лв)", symbol: "лв" },
  { code: "USD", label: "Щатски долар ($)", symbol: "$" },
  { code: "GBP", label: "Британска лира (£)", symbol: "£" },
  { code: "CHF", label: "Швейцарски франк", symbol: "CHF" },
  { code: "RON", label: "Румънска лея", symbol: "lei" },
  { code: "TRY", label: "Турска лира (₺)", symbol: "₺" },
  { code: "PLN", label: "Полска злота", symbol: "zł" },
  { code: "CZK", label: "Чешка крона", symbol: "Kč" },
  { code: "SEK", label: "Шведска крона", symbol: "kr" },
  { code: "NOK", label: "Норвежка крона", symbol: "kr" },
  { code: "CAD", label: "Канадски долар", symbol: "C$" },
  { code: "AUD", label: "Австралийски долар", symbol: "A$" },
  { code: "JPY", label: "Японска йена (¥)", symbol: "¥" },
  { code: "CNY", label: "Китайски юан", symbol: "¥" },
] as const;

// Езици за документите
export const DOC_LANGUAGES = [
  { code: "bg", label: "Български" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "ro", label: "Română" },
  { code: "el", label: "Ελληνικά" },
] as const;

// 10 дизайна за фактури (layout: classic | band | minimal)
export const INVOICE_TEMPLATES = [
  { id: "classic", name: "Класически", accent: "#1F6F54", layout: "classic" },
  { id: "modern", name: "Модерен", accent: "#2C4A66", layout: "band" },
  { id: "minimal", name: "Минимал", accent: "#16201C", layout: "minimal" },
  { id: "elegant", name: "Елегантен", accent: "#A6822F", layout: "classic" },
  { id: "bold", name: "Контрастен", accent: "#A23B2B", layout: "band" },
  { id: "corporate", name: "Корпоративен", accent: "#2C4A66", layout: "band" },
  { id: "fresh", name: "Свеж", accent: "#3F9C82", layout: "classic" },
  { id: "warm", name: "Топъл", accent: "#C49A45", layout: "classic" },
  { id: "mono", name: "Монохром", accent: "#3A4540", layout: "minimal" },
  { id: "premium", name: "Премиум", accent: "#16201C", layout: "band" },
] as const;

export function getTemplate(id: string | null | undefined) {
  return INVOICE_TEMPLATES.find((t) => t.id === id) ?? INVOICE_TEMPLATES[0];
}

export const PAYMENT_METHODS = [
  { id: "cash", label: "В брой" },
  { id: "bank_transfer", label: "Банков път" },
  { id: "cod", label: "Наложен платеж" },
  { id: "card", label: "С карта" },
  { id: "payment_order", label: "Платежно нареждане" },
  { id: "cheque", label: "Чек / Ваучер" },
  { id: "offset", label: "С насрещно прихващане" },
  { id: "money_transfer", label: "Паричен превод" },
  { id: "epay", label: "ePay" },
  { id: "paypal", label: "PayPal" },
  { id: "stripe", label: "Stripe" },
  { id: "revolut", label: "Revolut" },
  { id: "easypay", label: "EasyPay" },
  { id: "postal", label: "Пощенски паричен превод" },
  { id: "other", label: "Друг" },
] as const;

export function paymentMethodLabel(id: string): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

export const DOC_STATUSES = [
  { value: "draft", label: "Чернова", color: "muted" },
  { value: "issued", label: "Издадена", color: "navy" },
  { value: "sent", label: "Изпратена", color: "navy" },
  { value: "partially_paid", label: "Частично платена", color: "brass" },
  { value: "paid", label: "Платена", color: "emerald" },
  { value: "overdue", label: "Просрочена", color: "brick" },
  { value: "cancelled", label: "Анулирана", color: "brick" },
] as const;

// ─── Абонаментни планове (нови цени) ─────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  free: { name: "Безплатен", price: 0, docsPerMonth: 5, users: 1, companies: 1 },
  start: { name: "Старт", price: 9, docsPerMonth: 50, users: 1, companies: 1 },
  business: { name: "Бизнес", price: 29, docsPerMonth: 300, users: 5, companies: 1 },
  pro: { name: "Про", price: 59, docsPerMonth: Infinity, users: Infinity, companies: Infinity },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// Кои функции са достъпни за кой план (за заключване в UI)
export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: ["documents", "clients", "suppliers", "warehouse", "dashboard", "cash"],
  start: ["documents", "clients", "suppliers", "warehouse", "dashboard", "cash", "expenses", "recurring"],
  business: [
    "documents", "clients", "suppliers", "warehouse", "dashboard", "cash", "expenses",
    "recurring", "projects", "contracts", "analytics", "archive", "assets", "users", "audit",
  ],
  pro: [
    "documents", "clients", "suppliers", "warehouse", "dashboard", "cash", "expenses",
    "recurring", "projects", "contracts", "analytics", "archive", "assets", "users", "audit",
    "multicompany", "ai", "api",
  ],
};

const PLAN_RANK: Record<PlanId, number> = { free: 0, start: 1, business: 2, pro: 3 };

export function planHasFeature(plan: PlanId, feature: string): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

// Минималният план, който отключва дадена функция
export function minPlanForFeature(feature: string): PlanId {
  const order: PlanId[] = ["free", "start", "business", "pro"];
  for (const p of order) {
    if (PLAN_FEATURES[p].includes(feature)) return p;
  }
  return "pro";
}

export function planRank(plan: PlanId): number {
  return PLAN_RANK[plan] ?? 0;
}

export function isDualCurrencyActive(): boolean {
  return new Date() < DUAL_CURRENCY_UNTIL;
}

export function toBGN(eur: number): number {
  return Math.round(eur * EUR_TO_BGN * 100) / 100;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("bg-BG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("bg-BG").format(new Date(date));
}

export function getYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const BG_MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

/** Групира записи по месец и година (по issueDate), най-новите първи. */
export function groupByMonth<T extends { issueDate: Date | string }>(items: T[]) {
  const map = new Map<string, { key: string; label: string; items: T[] }>();
  for (const it of items) {
    const d = new Date(it.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { key, label: `${BG_MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [] });
    map.get(key)!.items.push(it);
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}
