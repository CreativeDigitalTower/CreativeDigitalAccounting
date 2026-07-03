export const EUR_TO_BGN = 1.95583;
export const DUAL_CURRENCY_UNTIL = new Date("2026-08-08");
export const FREE_PLAN_LIMIT = 5; // документа/месец

export const COMPANY_NAME = "Криейтив Диджитъл Тауър ЕООД";
export const COMPANY_EIK = "205748188";
export const COMPANY_WEBSITE = "https://creativedigitaltower.com/";
export const COMPANY_EMAIL = "office@creativedigitalaccounting.com";
export const FACEBOOK_PAGE = "https://www.facebook.com/CreativeDigitalAccounting";
export const FACEBOOK_PAGE_ID = "CreativeDigitalAccounting";

// Платформа (изписва се на всеки генериран документ)
export const PLATFORM_NAME = "Creative Digital Accounting";
export const PLATFORM_URL = "www.creativedigitalaccounting.com";
// Изписване с главни букви за визуализация (документи, имейли)
export const PLATFORM_URL_DISPLAY = "www.CreativeDigitalAccounting.com";
export const PLATFORM_CREDIT = `Документът е създаден с платформата ${PLATFORM_NAME} · ${PLATFORM_URL_DISPLAY}`;

// Банкови данни за абонаменти (само банков превод засега)
export const BANK_DETAILS = {
  recipient: "Криейтив Диджитъл Тауър ЕООД",
  iban: "BG84STSA93000028480494",
  bank: "Банка ДСК",
  reason: "Абонамент Creative Digital Accounting — избран пакет",
};

export const VAT_RATES = [0, 9, 20] as const;

// Основания за неначисляване на ДДС (конфигурация — лесно разширяема без промяна на логиката).
// `code` се пази в базата; `label` е за визуализация; `text` се изписва във фактурата.
export const VAT_EXEMPT_REASONS: { code: string; label: string; text: string }[] = [
  { code: "art113_9", label: "чл. 113, ал. 9 от ЗДДС – Лицето не е регистрирано по ЗДДС", text: "чл. 113, ал. 9 от ЗДДС – Лицето не е регистрирано по ЗДДС." },
  { code: "art86_3", label: "чл. 86, ал. 3 от ЗДДС", text: "чл. 86, ал. 3 от ЗДДС." },
  { code: "art21", label: "чл. 21 от ЗДДС – Място на изпълнение извън територията на България", text: "чл. 21 от ЗДДС – Мястото на изпълнение е извън територията на страната." },
  { code: "art82", label: "чл. 82 от ЗДДС – Обратно начисляване (reverse charge)", text: "чл. 82, ал. 2 от ЗДДС – Данъкът е изискуем от получателя (обратно начисляване)." },
  { code: "art28", label: "чл. 28 от ЗДДС – Вътреобщностна доставка", text: "чл. 28 от ЗДДС – Вътреобщностна доставка на стоки." },
  { code: "art31", label: "чл. 31 от ЗДДС – Международен транспорт", text: "чл. 31 от ЗДДС – Международен транспорт." },
  { code: "art39", label: "чл. 39 от ЗДДС – Освободена доставка", text: "чл. 39 от ЗДДС – Освободена доставка." },
  { code: "art50", label: "чл. 50 от ЗДДС", text: "чл. 50 от ЗДДС." },
  { code: "art173", label: "чл. 173 от ЗДДС", text: "чл. 173 от ЗДДС." },
  { code: "other", label: "Друго основание…", text: "" },
];

export function vatExemptReasonText(codeOrText: string | null | undefined): string {
  if (!codeOrText) return "";
  const found = VAT_EXEMPT_REASONS.find((r) => r.code === codeOrText);
  if (found) return found.text || codeOrText;
  return codeOrText; // свободен текст (Друго основание)
}

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
  { id: "elegant", name: "Елегантен", accent: "#A6822F", layout: "centered" },
  { id: "bold", name: "Контрастен", accent: "#A23B2B", layout: "leftrail" },
  { id: "corporate", name: "Корпоративен", accent: "#2C4A66", layout: "boxed" },
  { id: "fresh", name: "Свеж", accent: "#3F9C82", layout: "split" },
  { id: "warm", name: "Топъл", accent: "#C49A45", layout: "centered" },
  { id: "mono", name: "Монохром", accent: "#3A4540", layout: "minimal" },
  { id: "premium", name: "Премиум", accent: "#16201C", layout: "leftrail" },
  // Нови стилове
  { id: "aurora", name: "Аврора", accent: "#0F8A6A", layout: "gradient" },
  { id: "lumen", name: "Лумен", accent: "#2C4A66", layout: "letterhead" },
  { id: "atlas", name: "Атлас", accent: "#5A3E85", layout: "sidebar" },
  { id: "ledger", name: "Леджър", accent: "#2F2A24", layout: "typewriter" },
  { id: "duo", name: "Дуо", accent: "#B0552B", layout: "cards" },
] as const;

export function getTemplate(id: string | null | undefined) {
  return INVOICE_TEMPLATES.find((t) => t.id === id) ?? INVOICE_TEMPLATES[0];
}

// Мерни единици за складови артикули и производство
export const STOCK_UNITS = [
  "бр", "кг", "г", "мг", "т", "л", "мл", "м", "см", "мм",
  "кв.м", "куб.м", "оп.", "пакет", "кашон", "каса", "стек", "чувал", "ролка", "комплект", "час",
] as const;

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
// Промоционален период — промо цените важат при абониране до тази дата
export const PROMO_UNTIL = new Date("2026-12-31T23:59:59");
export function isPromoActive(): boolean {
  return new Date() <= PROMO_UNTIL;
}

// Лимити и цени по план.
// price = промоционална (launch) цена; regularPrice = редовна цена.
export const SUBSCRIPTION_PLANS = {
  free:     { name: "Безплатен", regularPrice: 0,  price: 0,  docsPerMonth: 5,        users: 1,        companies: 1,        clients: 5,        suppliers: 5,        pdfTemplates: 2 },
  start:    { name: "Старт",     regularPrice: 15, price: 9,  docsPerMonth: 30,       users: 2,        companies: 1,        clients: Infinity, suppliers: Infinity, pdfTemplates: 3 },
  business: { name: "Бизнес",    regularPrice: 39, price: 29, docsPerMonth: 300,      users: 5,        companies: 1,        clients: Infinity, suppliers: Infinity, pdfTemplates: Infinity },
  pro:      { name: "Про",       regularPrice: 79, price: 59, docsPerMonth: Infinity, users: Infinity, companies: Infinity, clients: Infinity, suppliers: Infinity, pdfTemplates: Infinity },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// Цена за изобразяване според промо периода
export function planPrice(plan: PlanId): number {
  return isPromoActive() ? SUBSCRIPTION_PLANS[plan].price : SUBSCRIPTION_PLANS[plan].regularPrice;
}

// Видове официални изходящи документи, които се броят към месечния лимит
export const OFFICIAL_DOC_TYPES = ["invoice", "proforma", "quote", "credit_note", "debit_note"] as const;

// Кои функции са достъпни за кой план (за заключване в UI и сървъра)
const FREE_FEATURES = ["documents", "clients", "suppliers", "warehouse", "dashboard", "cash", "tax_calendar"];
const START_FEATURES = [...FREE_FEATURES, "expenses", "recurring", "analytics", "archive", "invoice_logo", "protocols", "bank_statements"];
const BUSINESS_FEATURES = [
  ...START_FEATURES,
  "projects", "contracts", "assets", "users", "audit",
  "production", "employees", "haccp", "revision", "stock_categories", "health_index", "declarations", "doc_templates",
  "employee_portal", "project_management",
];
const PRO_FEATURES = [...BUSINESS_FEATURES, "multicompany", "ai", "api"];

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: FREE_FEATURES,
  start: START_FEATURES,
  business: BUSINESS_FEATURES,
  pro: PRO_FEATURES,
};

// Човешки етикети на функциите (за locked съобщения)
export const FEATURE_LABELS: Record<string, string> = {
  expenses: "Разходи и входящи документи", recurring: "Повтарящи се фактури", analytics: "Анализи",
  archive: "Документен архив", projects: "Проекти", contracts: "Договори", assets: "Активи",
  users: "Потребители и роли", audit: "Одит лог", production: "Производство", employees: "Служители",
  haccp: "HACCP / ТД", revision: "Ревизия", stock_categories: "Складови категории",
  health_index: "Бизнес здравен индекс", declarations: "Декларации за съответствие",
  tax_calendar: "Данъчен календар", multicompany: "Многофирмен режим", ai: "AI CFO Assistant",
  api: "API достъп", invoice_logo: "Лого във фактурите", protocols: "Приемо-предавателни протоколи",
  bank_statements: "Банкови извлечения", doc_templates: "Генериране на бизнес документи",
  employee_portal: "Портал за служители (самообслужване)",
  project_management: "Project Management (задачи по фирми и екипи)",
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

export function planLabel(plan: string): string {
  return SUBSCRIPTION_PLANS[plan as PlanId]?.name ?? plan;
}

// Съобщение за заключена функция, насочващо към правилния по-висок план
export function featureUpgradeMessage(feature: string): string {
  const min = minPlanForFeature(feature);
  const label = FEATURE_LABELS[feature] ?? "Тази функция";
  return `${label} е достъпна в план „${planLabel(min)}" и по-висок.`;
}

// Кои шаблони за фактури са позволени за плана (първите N по ред)
export function allowedTemplateCount(plan: PlanId): number {
  return SUBSCRIPTION_PLANS[plan]?.pdfTemplates ?? 2;
}
export function isTemplateAllowed(plan: PlanId, index: number): boolean {
  const n = allowedTemplateCount(plan);
  return n === Infinity || index < n;
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
