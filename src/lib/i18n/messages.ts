import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

// Регистър на преводните пространства (namespaces). Добавяне на нов namespace =
// нов JSON файл за всеки език + нов ред тук. Добавяне на нов език = нов блок.
import bgCommon from "@/locales/bg/common.json";
import bgNav from "@/locales/bg/navigation.json";
import bgAuth from "@/locales/bg/auth.json";
import bgBi from "@/locales/bg/bi.json";
import bgPdf from "@/locales/bg/pdf.json";
import bgEmails from "@/locales/bg/emails.json";
import bgNotif from "@/locales/bg/notifications.json";
import bgClients from "@/locales/bg/clients.json";
import bgSuppliers from "@/locales/bg/suppliers.json";
import bgExpenses from "@/locales/bg/expenses.json";
import bgContracts from "@/locales/bg/contracts.json";
import bgProjects from "@/locales/bg/projects.json";
import bgWarehouse from "@/locales/bg/warehouse.json";
import bgEmployees from "@/locales/bg/employees.json";
import enCommon from "@/locales/en/common.json";
import enNav from "@/locales/en/navigation.json";
import enAuth from "@/locales/en/auth.json";
import enBi from "@/locales/en/bi.json";
import enPdf from "@/locales/en/pdf.json";
import enEmails from "@/locales/en/emails.json";
import enNotif from "@/locales/en/notifications.json";
import enClients from "@/locales/en/clients.json";
import enSuppliers from "@/locales/en/suppliers.json";
import enExpenses from "@/locales/en/expenses.json";
import enContracts from "@/locales/en/contracts.json";
import enProjects from "@/locales/en/projects.json";
import enWarehouse from "@/locales/en/warehouse.json";
import enEmployees from "@/locales/en/employees.json";
import ruCommon from "@/locales/ru/common.json";
import ruNav from "@/locales/ru/navigation.json";
import ruAuth from "@/locales/ru/auth.json";
import ruBi from "@/locales/ru/bi.json";
import ruPdf from "@/locales/ru/pdf.json";
import ruEmails from "@/locales/ru/emails.json";
import ruNotif from "@/locales/ru/notifications.json";
import ruClients from "@/locales/ru/clients.json";
import ruSuppliers from "@/locales/ru/suppliers.json";
import ruExpenses from "@/locales/ru/expenses.json";
import ruContracts from "@/locales/ru/contracts.json";
import ruProjects from "@/locales/ru/projects.json";
import ruWarehouse from "@/locales/ru/warehouse.json";
import ruEmployees from "@/locales/ru/employees.json";
import roCommon from "@/locales/ro/common.json";
import roNav from "@/locales/ro/navigation.json";
import roAuth from "@/locales/ro/auth.json";
import roBi from "@/locales/ro/bi.json";
import roPdf from "@/locales/ro/pdf.json";
import roEmails from "@/locales/ro/emails.json";
import roNotif from "@/locales/ro/notifications.json";
import roClients from "@/locales/ro/clients.json";
import roSuppliers from "@/locales/ro/suppliers.json";
import roExpenses from "@/locales/ro/expenses.json";
import roContracts from "@/locales/ro/contracts.json";
import roProjects from "@/locales/ro/projects.json";
import roWarehouse from "@/locales/ro/warehouse.json";
import roEmployees from "@/locales/ro/employees.json";
import trCommon from "@/locales/tr/common.json";
import trNav from "@/locales/tr/navigation.json";
import trAuth from "@/locales/tr/auth.json";
import trBi from "@/locales/tr/bi.json";
import trPdf from "@/locales/tr/pdf.json";
import trEmails from "@/locales/tr/emails.json";
import trNotif from "@/locales/tr/notifications.json";
import trClients from "@/locales/tr/clients.json";
import trSuppliers from "@/locales/tr/suppliers.json";
import trExpenses from "@/locales/tr/expenses.json";
import trContracts from "@/locales/tr/contracts.json";
import trProjects from "@/locales/tr/projects.json";
import trWarehouse from "@/locales/tr/warehouse.json";
import trEmployees from "@/locales/tr/employees.json";
import elCommon from "@/locales/el/common.json";
import elNav from "@/locales/el/navigation.json";
import elAuth from "@/locales/el/auth.json";
import elBi from "@/locales/el/bi.json";
import elPdf from "@/locales/el/pdf.json";
import elEmails from "@/locales/el/emails.json";
import elNotif from "@/locales/el/notifications.json";
import elClients from "@/locales/el/clients.json";
import elSuppliers from "@/locales/el/suppliers.json";
import elExpenses from "@/locales/el/expenses.json";
import elContracts from "@/locales/el/contracts.json";
import elProjects from "@/locales/el/projects.json";
import elWarehouse from "@/locales/el/warehouse.json";
import elEmployees from "@/locales/el/employees.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Messages = Record<string, any>;

const DICTS: Record<Locale, Messages> = {
  bg: { common: bgCommon, navigation: bgNav, auth: bgAuth, bi: bgBi, pdf: bgPdf, emails: bgEmails, notifications: bgNotif, clients: bgClients, suppliers: bgSuppliers, expenses: bgExpenses, contracts: bgContracts, projects: bgProjects, warehouse: bgWarehouse, employees: bgEmployees },
  en: { common: enCommon, navigation: enNav, auth: enAuth, bi: enBi, pdf: enPdf, emails: enEmails, notifications: enNotif, clients: enClients, suppliers: enSuppliers, expenses: enExpenses, contracts: enContracts, projects: enProjects, warehouse: enWarehouse, employees: enEmployees },
  ru: { common: ruCommon, navigation: ruNav, auth: ruAuth, bi: ruBi, pdf: ruPdf, emails: ruEmails, notifications: ruNotif, clients: ruClients, suppliers: ruSuppliers, expenses: ruExpenses, contracts: ruContracts, projects: ruProjects, warehouse: ruWarehouse, employees: ruEmployees },
  ro: { common: roCommon, navigation: roNav, auth: roAuth, bi: roBi, pdf: roPdf, emails: roEmails, notifications: roNotif, clients: roClients, suppliers: roSuppliers, expenses: roExpenses, contracts: roContracts, projects: roProjects, warehouse: roWarehouse, employees: roEmployees },
  tr: { common: trCommon, navigation: trNav, auth: trAuth, bi: trBi, pdf: trPdf, emails: trEmails, notifications: trNotif, clients: trClients, suppliers: trSuppliers, expenses: trExpenses, contracts: trContracts, projects: trProjects, warehouse: trWarehouse, employees: trEmployees },
  el: { common: elCommon, navigation: elNav, auth: elAuth, bi: elBi, pdf: elPdf, emails: elEmails, notifications: elNotif, clients: elClients, suppliers: elSuppliers, expenses: elExpenses, contracts: elContracts, projects: elProjects, warehouse: elWarehouse, employees: elEmployees },
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
