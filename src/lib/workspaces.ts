import {
  IconInvoice, IconUsers, IconProjects, IconExpense, IconChart, IconWarehouse,
  IconFactory, IconCash, IconDoc, IconCalendar, IconFileStack, IconBuilding,
} from "@/components/Icons";

// ─── Каталог с карти за бързи действия (централизиран) ───
export const DASHBOARD_CARDS: Record<string, { label: string; href: string; Icon: typeof IconInvoice }> = {
  invoice: { label: "Издай фактура", href: "/dashboard/documents/new?type=invoice", Icon: IconInvoice },
  offer: { label: "Нова оферта", href: "/dashboard/documents/new?type=quote", Icon: IconInvoice },
  sales: { label: "Продажби", href: "/dashboard/invoices", Icon: IconCash },
  orders: { label: "Поръчки / Документи", href: "/dashboard/documents", Icon: IconDoc },
  client: { label: "Нов клиент", href: "/dashboard/clients/new", Icon: IconUsers },
  project: { label: "Нов проект", href: "/dashboard/projects/new", Icon: IconProjects },
  expense: { label: "Нов разход", href: "/dashboard/expenses/new", Icon: IconExpense },
  analytics: { label: "Финансови анализи", href: "/dashboard/analytics", Icon: IconChart },
  warehouse: { label: "Склад", href: "/dashboard/warehouse", Icon: IconWarehouse },
  materials: { label: "Заприходяване", href: "/dashboard/warehouse/receive", Icon: IconWarehouse },
  production: { label: "Производство", href: "/dashboard/production", Icon: IconFactory },
  suppliers: { label: "Доставчици", href: "/dashboard/suppliers", Icon: IconBuilding },
  employees: { label: "Служители", href: "/dashboard/employees", Icon: IconBuilding },
  contracts: { label: "Договори", href: "/dashboard/contracts", Icon: IconDoc },
  cash: { label: "Каса", href: "/dashboard/cash", Icon: IconCash },
  tax: { label: "Данъчен календар", href: "/dashboard/tax-calendar", Icon: IconCalendar },
  documents: { label: "Бизнес документи", href: "/dashboard/business-docs", Icon: IconFileStack },
};

export type Sector = {
  id: string;
  title: string;
  Icon: typeof IconInvoice;
  subcategories: string[];
  cards: string[]; // ключове от DASHBOARD_CARDS (препоръчителен ред)
};

export const COMPANY_SIZES = [
  { id: "solo", label: "Само аз" },
  { id: "2-5", label: "2–5 служители" },
  { id: "6-20", label: "6–20 служители" },
  { id: "21-50", label: "21–50 служители" },
  { id: "50+", label: "Над 50 служители" },
];

// ─── Сектори с подкатегории и препоръчителни карти (централизирана конфигурация) ───
export const SECTORS: Sector[] = [
  { id: "services", title: "Услуги", Icon: IconUsers, cards: ["invoice", "client", "project", "expense", "analytics", "documents"],
    subcategories: ["Дигитална агенция", "Маркетинг агенция", "IT компания", "Софтуерна компания", "Счетоводна къща", "Адвокатска кантора", "Архитектурно студио", "Консултантска фирма", "Дизайн студио", "HR агенция", "Друга услуга"] },
  { id: "trade", title: "Търговия", Icon: IconCash, cards: ["sales", "warehouse", "orders", "client", "invoice"],
    subcategories: ["Онлайн магазин", "Търговия на дребно", "Търговия на едро", "Магазин", "Дистрибуция", "Друга търговия"] },
  { id: "production", title: "Производство", Icon: IconFactory, cards: ["production", "warehouse", "materials", "suppliers", "expense"],
    subcategories: ["Хранително производство", "Пекарна / Сладкарница", "Мебелно производство", "Текстил и облекло", "Метал и машини", "Печат и опаковки", "Друго производство"] },
  { id: "construction", title: "Строителство", Icon: IconBuilding, cards: ["project", "contracts", "expense", "client", "invoice"],
    subcategories: ["Строителна фирма", "Ремонти и довършителни работи", "Електро услуги", "ВиК услуги", "Архитектура и проектиране", "Друго"] },
  { id: "horeca", title: "Заведения", Icon: IconCash, cards: ["sales", "warehouse", "suppliers", "expense"],
    subcategories: ["Ресторант", "Кафе / Сладкарница", "Бар", "Кетъринг", "Хотел-ресторант", "Друго"] },
  { id: "beauty", title: "Здраве и красота", Icon: IconUsers, cards: ["invoice", "client", "expense", "analytics"],
    subcategories: ["Салон за красота", "Фризьорство", "Козметика", "СПА и уелнес", "Фитнес", "Стоматология", "Медицински център", "Друго"] },
  { id: "tourism", title: "Туризъм", Icon: IconBuilding, cards: ["invoice", "client", "expense", "analytics"],
    subcategories: ["Хотел", "Къща за гости", "Туроператор", "Турагенция", "Друго"] },
  { id: "education", title: "Образование", Icon: IconDoc, cards: ["invoice", "client", "expense", "analytics"],
    subcategories: ["Учебен център", "Езикова школа", "Детски център", "Онлайн обучения", "Друго"] },
  { id: "transport", title: "Транспорт и логистика", Icon: IconProjects, cards: ["invoice", "client", "contracts", "expense"],
    subcategories: ["Транспорт", "Спедиция", "Куриерски услуги", "Таксиметров превоз", "Друго"] },
  { id: "agriculture", title: "Земеделие", Icon: IconWarehouse, cards: ["warehouse", "expense", "suppliers", "invoice"],
    subcategories: ["Растениевъдство", "Животновъдство", "Пчеларство", "Друго"] },
  { id: "realestate", title: "Недвижими имоти", Icon: IconBuilding, cards: ["client", "contracts", "invoice", "expense"],
    subcategories: ["Агенция за имоти", "Управление на имоти", "Строителен предприемач", "Друго"] },
  { id: "freelance", title: "Свободна професия", Icon: IconUsers, cards: ["invoice", "client", "expense", "offer", "documents"],
    subcategories: ["Фрийлансър", "Консултант", "Дизайнер", "Програмист", "Друго"] },
  { id: "other", title: "Друго", Icon: IconBuilding, cards: ["invoice", "client", "expense", "analytics"],
    subcategories: ["Друго"] },
];

const DEFAULT_CARDS = ["invoice", "client", "expense", "analytics", "warehouse", "documents"];

export function getSector(id: string | null | undefined): Sector | undefined {
  return SECTORS.find((s) => s.id === id);
}

export function recommendedCards(sectorId: string | null | undefined): string[] {
  return getSector(sectorId)?.cards ?? DEFAULT_CARDS;
}

export type DashboardLayout = { order: string[]; hidden: string[] };

/** Изчислява подреждането на картите: персонализирано или препоръчително. */
export function resolveLayout(sectorId: string | null | undefined, layoutJson: string | null | undefined, isCustom: boolean): string[] {
  const recommended = recommendedCards(sectorId);
  if (!isCustom || !layoutJson) return recommended;
  try {
    const layout = JSON.parse(layoutJson) as DashboardLayout;
    const order = layout.order?.length ? layout.order : recommended;
    const hidden = new Set(layout.hidden ?? []);
    return order.filter((k) => DASHBOARD_CARDS[k] && !hidden.has(k));
  } catch {
    return recommended;
  }
}

export const SIZE_LABEL = (id: string | null | undefined) => COMPANY_SIZES.find((s) => s.id === id)?.label ?? "—";
export const SECTOR_TITLE = (id: string | null | undefined) => getSector(id)?.title ?? "—";
