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
import bgDocuments from "@/locales/bg/documents.json";
import bgAssets from "@/locales/bg/assets.json";
import bgModules from "@/locales/bg/modules.json";
import bgAccount from "@/locales/bg/account.json";
import bgSubdocs from "@/locales/bg/subdocs.json";
import bgHaccp from "@/locales/bg/haccp.json";
import bgPm from "@/locales/bg/pm.json";
import bgPortal from "@/locales/bg/portal.json";
import bgAdmin from "@/locales/bg/admin.json";
import bgMailattach from "@/locales/bg/mailattach.json";
import bgMarketing from "@/locales/bg/marketing.json";
import bgPricing from "@/locales/bg/pricing.json";
import bgRegister from "@/locales/bg/register.json";
import bgEnums from "@/locales/bg/enums.json";
import bgAdmintools from "@/locales/bg/admintools.json";
import bgProduction from "@/locales/bg/production.json";
import bgMisc from "@/locales/bg/misc.json";
import bgFirmbi from "@/locales/bg/firmbi.json";
import bgSectors from "@/locales/bg/sectors.json";
import bgFinance from "@/locales/bg/finance.json";
import bgWidgets from "@/locales/bg/widgets.json";
import bgSimulators from "@/locales/bg/simulators.json";
import bgBlog from "@/locales/bg/blog.json";
import bgBizdocs from "@/locales/bg/bizdocs.json";
import bgTools from "@/locales/bg/tools.json";
import bgBilling from "@/locales/bg/billing.json";
import bgBlogpublic from "@/locales/bg/blogpublic.json";
import bgChrome from "@/locales/bg/chrome.json";
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
import enDocuments from "@/locales/en/documents.json";
import enAssets from "@/locales/en/assets.json";
import enModules from "@/locales/en/modules.json";
import enAccount from "@/locales/en/account.json";
import enSubdocs from "@/locales/en/subdocs.json";
import enHaccp from "@/locales/en/haccp.json";
import enPm from "@/locales/en/pm.json";
import enPortal from "@/locales/en/portal.json";
import enAdmin from "@/locales/en/admin.json";
import enMailattach from "@/locales/en/mailattach.json";
import enMarketing from "@/locales/en/marketing.json";
import enPricing from "@/locales/en/pricing.json";
import enRegister from "@/locales/en/register.json";
import enEnums from "@/locales/en/enums.json";
import enAdmintools from "@/locales/en/admintools.json";
import enProduction from "@/locales/en/production.json";
import enMisc from "@/locales/en/misc.json";
import enFirmbi from "@/locales/en/firmbi.json";
import enSectors from "@/locales/en/sectors.json";
import enFinance from "@/locales/en/finance.json";
import enWidgets from "@/locales/en/widgets.json";
import enSimulators from "@/locales/en/simulators.json";
import enBlog from "@/locales/en/blog.json";
import enBizdocs from "@/locales/en/bizdocs.json";
import enTools from "@/locales/en/tools.json";
import enBilling from "@/locales/en/billing.json";
import enBlogpublic from "@/locales/en/blogpublic.json";
import enChrome from "@/locales/en/chrome.json";
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
import ruDocuments from "@/locales/ru/documents.json";
import ruAssets from "@/locales/ru/assets.json";
import ruModules from "@/locales/ru/modules.json";
import ruAccount from "@/locales/ru/account.json";
import ruSubdocs from "@/locales/ru/subdocs.json";
import ruHaccp from "@/locales/ru/haccp.json";
import ruPm from "@/locales/ru/pm.json";
import ruPortal from "@/locales/ru/portal.json";
import ruAdmin from "@/locales/ru/admin.json";
import ruMailattach from "@/locales/ru/mailattach.json";
import ruMarketing from "@/locales/ru/marketing.json";
import ruPricing from "@/locales/ru/pricing.json";
import ruRegister from "@/locales/ru/register.json";
import ruEnums from "@/locales/ru/enums.json";
import ruAdmintools from "@/locales/ru/admintools.json";
import ruProduction from "@/locales/ru/production.json";
import ruMisc from "@/locales/ru/misc.json";
import ruFirmbi from "@/locales/ru/firmbi.json";
import ruSectors from "@/locales/ru/sectors.json";
import ruFinance from "@/locales/ru/finance.json";
import ruWidgets from "@/locales/ru/widgets.json";
import ruSimulators from "@/locales/ru/simulators.json";
import ruBlog from "@/locales/ru/blog.json";
import ruBizdocs from "@/locales/ru/bizdocs.json";
import ruTools from "@/locales/ru/tools.json";
import ruBilling from "@/locales/ru/billing.json";
import ruBlogpublic from "@/locales/ru/blogpublic.json";
import ruChrome from "@/locales/ru/chrome.json";
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
import roDocuments from "@/locales/ro/documents.json";
import roAssets from "@/locales/ro/assets.json";
import roModules from "@/locales/ro/modules.json";
import roAccount from "@/locales/ro/account.json";
import roSubdocs from "@/locales/ro/subdocs.json";
import roHaccp from "@/locales/ro/haccp.json";
import roPm from "@/locales/ro/pm.json";
import roPortal from "@/locales/ro/portal.json";
import roAdmin from "@/locales/ro/admin.json";
import roMailattach from "@/locales/ro/mailattach.json";
import roMarketing from "@/locales/ro/marketing.json";
import roPricing from "@/locales/ro/pricing.json";
import roRegister from "@/locales/ro/register.json";
import roEnums from "@/locales/ro/enums.json";
import roAdmintools from "@/locales/ro/admintools.json";
import roProduction from "@/locales/ro/production.json";
import roMisc from "@/locales/ro/misc.json";
import roFirmbi from "@/locales/ro/firmbi.json";
import roSectors from "@/locales/ro/sectors.json";
import roFinance from "@/locales/ro/finance.json";
import roWidgets from "@/locales/ro/widgets.json";
import roSimulators from "@/locales/ro/simulators.json";
import roBlog from "@/locales/ro/blog.json";
import roBizdocs from "@/locales/ro/bizdocs.json";
import roTools from "@/locales/ro/tools.json";
import roBilling from "@/locales/ro/billing.json";
import roBlogpublic from "@/locales/ro/blogpublic.json";
import roChrome from "@/locales/ro/chrome.json";
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
import trDocuments from "@/locales/tr/documents.json";
import trAssets from "@/locales/tr/assets.json";
import trModules from "@/locales/tr/modules.json";
import trAccount from "@/locales/tr/account.json";
import trSubdocs from "@/locales/tr/subdocs.json";
import trHaccp from "@/locales/tr/haccp.json";
import trPm from "@/locales/tr/pm.json";
import trPortal from "@/locales/tr/portal.json";
import trAdmin from "@/locales/tr/admin.json";
import trMailattach from "@/locales/tr/mailattach.json";
import trMarketing from "@/locales/tr/marketing.json";
import trPricing from "@/locales/tr/pricing.json";
import trRegister from "@/locales/tr/register.json";
import trEnums from "@/locales/tr/enums.json";
import trAdmintools from "@/locales/tr/admintools.json";
import trProduction from "@/locales/tr/production.json";
import trMisc from "@/locales/tr/misc.json";
import trFirmbi from "@/locales/tr/firmbi.json";
import trSectors from "@/locales/tr/sectors.json";
import trFinance from "@/locales/tr/finance.json";
import trWidgets from "@/locales/tr/widgets.json";
import trSimulators from "@/locales/tr/simulators.json";
import trBlog from "@/locales/tr/blog.json";
import trBizdocs from "@/locales/tr/bizdocs.json";
import trTools from "@/locales/tr/tools.json";
import trBilling from "@/locales/tr/billing.json";
import trBlogpublic from "@/locales/tr/blogpublic.json";
import trChrome from "@/locales/tr/chrome.json";
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
import elDocuments from "@/locales/el/documents.json";
import elAssets from "@/locales/el/assets.json";
import elModules from "@/locales/el/modules.json";
import elAccount from "@/locales/el/account.json";
import elSubdocs from "@/locales/el/subdocs.json";
import elHaccp from "@/locales/el/haccp.json";
import elPm from "@/locales/el/pm.json";
import elPortal from "@/locales/el/portal.json";
import elAdmin from "@/locales/el/admin.json";
import elMailattach from "@/locales/el/mailattach.json";
import elMarketing from "@/locales/el/marketing.json";
import elPricing from "@/locales/el/pricing.json";
import elRegister from "@/locales/el/register.json";
import elEnums from "@/locales/el/enums.json";
import elAdmintools from "@/locales/el/admintools.json";
import elProduction from "@/locales/el/production.json";
import elMisc from "@/locales/el/misc.json";
import elFirmbi from "@/locales/el/firmbi.json";
import elSectors from "@/locales/el/sectors.json";
import elFinance from "@/locales/el/finance.json";
import elWidgets from "@/locales/el/widgets.json";
import elSimulators from "@/locales/el/simulators.json";
import elBlog from "@/locales/el/blog.json";
import elBizdocs from "@/locales/el/bizdocs.json";
import elTools from "@/locales/el/tools.json";
import elBilling from "@/locales/el/billing.json";
import elBlogpublic from "@/locales/el/blogpublic.json";
import elChrome from "@/locales/el/chrome.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Messages = Record<string, any>;

const DICTS: Record<Locale, Messages> = {
  bg: { common: bgCommon, navigation: bgNav, auth: bgAuth, bi: bgBi, pdf: bgPdf, emails: bgEmails, notifications: bgNotif, clients: bgClients, suppliers: bgSuppliers, expenses: bgExpenses, contracts: bgContracts, projects: bgProjects, warehouse: bgWarehouse, employees: bgEmployees, documents: bgDocuments, assets: bgAssets, modules: bgModules, account: bgAccount, subdocs: bgSubdocs, haccp: bgHaccp, pm: bgPm, portal: bgPortal, admin: bgAdmin, mailattach: bgMailattach, marketing: bgMarketing, pricing: bgPricing, register: bgRegister, enums: bgEnums, admintools: bgAdmintools, production: bgProduction, misc: bgMisc, firmbi: bgFirmbi, sectors: bgSectors, finance: bgFinance, widgets: bgWidgets, simulators: bgSimulators, blog: bgBlog, bizdocs: bgBizdocs, tools: bgTools, billing: bgBilling, blogpublic: bgBlogpublic, chrome: bgChrome },
  en: { common: enCommon, navigation: enNav, auth: enAuth, bi: enBi, pdf: enPdf, emails: enEmails, notifications: enNotif, clients: enClients, suppliers: enSuppliers, expenses: enExpenses, contracts: enContracts, projects: enProjects, warehouse: enWarehouse, employees: enEmployees, documents: enDocuments, assets: enAssets, modules: enModules, account: enAccount, subdocs: enSubdocs, haccp: enHaccp, pm: enPm, portal: enPortal, admin: enAdmin, mailattach: enMailattach, marketing: enMarketing, pricing: enPricing, register: enRegister, enums: enEnums, admintools: enAdmintools, production: enProduction, misc: enMisc, firmbi: enFirmbi, sectors: enSectors, finance: enFinance, widgets: enWidgets, simulators: enSimulators, blog: enBlog, bizdocs: enBizdocs, tools: enTools, billing: enBilling, blogpublic: enBlogpublic, chrome: enChrome },
  ru: { common: ruCommon, navigation: ruNav, auth: ruAuth, bi: ruBi, pdf: ruPdf, emails: ruEmails, notifications: ruNotif, clients: ruClients, suppliers: ruSuppliers, expenses: ruExpenses, contracts: ruContracts, projects: ruProjects, warehouse: ruWarehouse, employees: ruEmployees, documents: ruDocuments, assets: ruAssets, modules: ruModules, account: ruAccount, subdocs: ruSubdocs, haccp: ruHaccp, pm: ruPm, portal: ruPortal, admin: ruAdmin, mailattach: ruMailattach, marketing: ruMarketing, pricing: ruPricing, register: ruRegister, enums: ruEnums, admintools: ruAdmintools, production: ruProduction, misc: ruMisc, firmbi: ruFirmbi, sectors: ruSectors, finance: ruFinance, widgets: ruWidgets, simulators: ruSimulators, blog: ruBlog, bizdocs: ruBizdocs, tools: ruTools, billing: ruBilling, blogpublic: ruBlogpublic, chrome: ruChrome },
  ro: { common: roCommon, navigation: roNav, auth: roAuth, bi: roBi, pdf: roPdf, emails: roEmails, notifications: roNotif, clients: roClients, suppliers: roSuppliers, expenses: roExpenses, contracts: roContracts, projects: roProjects, warehouse: roWarehouse, employees: roEmployees, documents: roDocuments, assets: roAssets, modules: roModules, account: roAccount, subdocs: roSubdocs, haccp: roHaccp, pm: roPm, portal: roPortal, admin: roAdmin, mailattach: roMailattach, marketing: roMarketing, pricing: roPricing, register: roRegister, enums: roEnums, admintools: roAdmintools, production: roProduction, misc: roMisc, firmbi: roFirmbi, sectors: roSectors, finance: roFinance, widgets: roWidgets, simulators: roSimulators, blog: roBlog, bizdocs: roBizdocs, tools: roTools, billing: roBilling, blogpublic: roBlogpublic, chrome: roChrome },
  tr: { common: trCommon, navigation: trNav, auth: trAuth, bi: trBi, pdf: trPdf, emails: trEmails, notifications: trNotif, clients: trClients, suppliers: trSuppliers, expenses: trExpenses, contracts: trContracts, projects: trProjects, warehouse: trWarehouse, employees: trEmployees, documents: trDocuments, assets: trAssets, modules: trModules, account: trAccount, subdocs: trSubdocs, haccp: trHaccp, pm: trPm, portal: trPortal, admin: trAdmin, mailattach: trMailattach, marketing: trMarketing, pricing: trPricing, register: trRegister, enums: trEnums, admintools: trAdmintools, production: trProduction, misc: trMisc, firmbi: trFirmbi, sectors: trSectors, finance: trFinance, widgets: trWidgets, simulators: trSimulators, blog: trBlog, bizdocs: trBizdocs, tools: trTools, billing: trBilling, blogpublic: trBlogpublic, chrome: trChrome },
  el: { common: elCommon, navigation: elNav, auth: elAuth, bi: elBi, pdf: elPdf, emails: elEmails, notifications: elNotif, clients: elClients, suppliers: elSuppliers, expenses: elExpenses, contracts: elContracts, projects: elProjects, warehouse: elWarehouse, employees: elEmployees, documents: elDocuments, assets: elAssets, modules: elModules, account: elAccount, subdocs: elSubdocs, haccp: elHaccp, pm: elPm, portal: elPortal, admin: elAdmin, mailattach: elMailattach, marketing: elMarketing, pricing: elPricing, register: elRegister, enums: elEnums, admintools: elAdmintools, production: elProduction, misc: elMisc, firmbi: elFirmbi, sectors: elSectors, finance: elFinance, widgets: elWidgets, simulators: elSimulators, blog: elBlog, bizdocs: elBizdocs, tools: elTools, billing: elBilling, blogpublic: elBlogpublic, chrome: elChrome },
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
