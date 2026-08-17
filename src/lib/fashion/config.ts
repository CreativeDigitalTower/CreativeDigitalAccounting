/**
 * Конфигурация на модул „Модно производство" (Fashion Production).
 *
 * Database-driven активиране през CompanyModuleAccess (без hardcode на ЕИК, без
 * промяна на код). Всичко е scoped по companyId — пълна изолация между фирмите,
 * по същия принцип като логистичния модул.
 */
export const FASHION_MODULE_KEY = "fashion_production";

/** Базов маршрут на модула (различен от наличния generic „/dashboard/production"). */
export const FASHION_BASE_PATH = "/dashboard/fashion";

/** Scope-ове за атомарната номерация (NumberSequence) — ползвани от следващите фази. */
export const FASHION_SEQ_SCOPE = {
  cutting: "fashion_cutting",       // CUT-YYYY-######
  production: "fashion_production",  // PRD-YYYY-######
  qc: "fashion_qc",                 // QC-YYYY-######
  sales: "fashion_sales",           // SAL-YYYY-######
} as const;
export type FashionSeqScope = (typeof FASHION_SEQ_SCOPE)[keyof typeof FASHION_SEQ_SCOPE];

/** Формати на номерата (префикс + година + zero-padded пореден номер). */
export const FASHION_NUMBER_FORMATS = {
  cutting: "CUT",
  production: "PRD",
  qc: "QC",
  sales: "SAL",
} as const;
/** Форматира документен номер: CUT-2026-000042. */
export function formatFashionNumber(prefix: string, year: number, value: number): string {
  return `${prefix}-${year}-${String(value).padStart(6, "0")}`;
}

/** Методи за себестойност (v1 = среднопретеглена). */
export const COSTING_METHODS = ["weighted_average"] as const;
export type CostingMethod = (typeof COSTING_METHODS)[number];

/** Методи за производствен overhead. */
export const OVERHEAD_METHODS = ["per_unit", "percent_labor"] as const;
export type OverheadMethod = (typeof OVERHEAD_METHODS)[number];

/** Настройки по подразбиране на модула (за нови FashionSettings записи). */
export const FASHION_DEFAULTS = {
  defaultCurrency: "EUR",
  laborHourlyRate: 0,
  costingMethod: "weighted_average" as CostingMethod,
  overheadMethod: "per_unit" as OverheadMethod,
  overheadValue: 0,
  allowNegativeStock: false,
};

/** Разделите на модула (навигация) — ключовете сочат към i18n namespace „fashion". */
export const FASHION_NAV = [
  { key: "dashboard", path: "" },
  { key: "materials", path: "/materials" },
  { key: "deliveries", path: "/deliveries" },
  { key: "styles", path: "/styles" },
  { key: "patterns", path: "/patterns" },
  { key: "bom", path: "/bom" },
  { key: "operations", path: "/operations" },
  { key: "cutting", path: "/cutting" },
  { key: "production", path: "/production" },
  { key: "qc", path: "/qc" },
  { key: "finishedGoods", path: "/finished-goods" },
  { key: "sales", path: "/sales" },
  { key: "costing", path: "/costing" },
  { key: "analytics", path: "/analytics" },
  { key: "settings", path: "/settings" },
] as const;
