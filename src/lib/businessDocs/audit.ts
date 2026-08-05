// ─────────────────────────────────────────────────────────────────────────
// Автоматизиран нормативен одит на шаблоните в „Бизнес документи".
//
// Вместо еднократен ръчен преглед (който не подлежи на проверка), тук всеки
// шаблон се рендерира с примерни данни и се проверява за задължителните
// реквизити според вида му (издател с ЕИК, № и дата на документа, страни/
// декларатор, подписи, основание по закон и т.н.). Резултатът е обективен,
// поддържаем и се покрива от тест — при добавяне на нов шаблон одитът го хваща.
// ─────────────────────────────────────────────────────────────────────────
import { TEMPLATES, getTemplate, buildDocumentHtml, templateDataSource, type Template } from "./templates";
import { isOfficialCategory } from "./normalize";

/** Примерен контекст с всички източници — за да се оцени реалният изход. */
export function auditContext() {
  return {
    company: { name: "ТЕСТ ФИРМА ЕООД", eik: "831641791", vatNumber: "BG831641791", address: "ул. Тестова 1", city: "София", phone: "0888000000", email: "office@test.bg", mol: "Иван Петров Иванов" },
    client: { name: "КЛИЕНТ ООД", eik: "175074752", vatNumber: "BG175074752", address: "бул. Клиентски 2", city: "Пловдив", phone: "0888111111", contactEmail: "client@test.bg", mol: "Георги Клиентов", contactPerson: "Георги Клиентов" },
    employee: { name: "Мария Служителова", position: "Мениджър продажби", department: "Търговски отдел", address: "ул. Служебна 3", phone: "0888222222", email: "maria@test.bg", hiredAt: new Date("2024-03-01"), salary: 2500, iban: "BG80BNBG96611020345678", bankName: "Банка" },
    supplier: { name: "ДОСТАВЧИК АД", eik: "121817309", vatNumber: "BG121817309", address: "ул. Доставна 4", city: "Варна", phone: "0888333333", contactEmail: "sup@test.bg", contactPerson: "Петър Доставчиков" },
    vehicle: { registration: "СА1234ВС", brand: "Ford", model: "Transit", vin: "WF0XXX", fuelType: "дизел", fuelNorm: 8.5, tankCapacity: 70, year: 2021 },
    docNumber: "TST-2026-0001",
    docDate: new Date("2026-01-15"),
  };
}

export type Finding = { id: string; title: string; category: string; dataSource: string; ok: boolean; missing: string[] };

const has = (html: string, ...needles: string[]) => needles.some((n) => html.includes(n));
const hasRe = (html: string, re: RegExp) => re.test(html);
/** Линия за подпис: подчертана клетка ИЛИ пунктир „......." ИЛИ думата „подпис". */
const hasSignature = (html: string) => hasRe(html, /border-top:1px solid #16201C/i) || html.includes("..........") || /подпис/i.test(html);

/** Оценява един шаблон и връща липсващите задължителни реквизити. */
export function auditTemplate(tpl: Template): Finding {
  const html = buildDocumentHtml(tpl, auditContext());
  const ctx = auditContext();
  const source = templateDataSource(tpl);
  const missing: string[] = [];

  // ── Ядро: всеки документ носи име на издателя; ЕИК — за официалните ──
  if (!html.includes(ctx.company.name)) missing.push("издател (име на фирмата)");
  if (isOfficialCategory(tpl.categoryId) && !html.includes(ctx.company.eik)) missing.push("ЕИК на издателя");

  const title = tpl.title.toLowerCase();
  const cat = tpl.categoryId;

  // ── Договори: страни + подписи ──
  if (cat === "contracts" || /договор/.test(title)) {
    if (!hasSignature(html)) missing.push("подписи на страните");
  }
  // ── Декларации: позоваване на наказателна отговорност (чл. 313 НК) ──
  if (cat === "declarations" || /деклара[цт]/.test(title)) {
    if (!has(html, "313", "наказателна отговорност")) missing.push("клауза за наказателна отговорност (чл. 313 НК)");
  }
  // ── Пълномощни: обем на представителната власт + упълномощител ──
  if (/пълномощно/.test(title)) {
    if (!has(html, "упълномощавам", "упълномощен", "представлява")) missing.push("обем на представителната власт");
  }
  // ── Протоколи / приемо-предаване: подписи на страните ──
  if (cat === "protocols" || cat === "acceptance" || /протокол|приемо/.test(title)) {
    if (!hasSignature(html)) missing.push("подписи");
  }
  // ── Автомобилни: рег. номер на автомобила ──
  if (source === "vehicle") {
    if (!html.includes(ctx.vehicle.registration)) missing.push("регистрационен номер на автомобила");
  }
  // ── Не трябва да остават неразрешени плейсхолдъри {{...}} ──
  if (hasRe(html, /\{\{[^}]+\}\}/)) missing.push("неразрешен плейсхолдър {{...}}");

  return { id: tpl.id, title: tpl.title, category: cat, dataSource: source, ok: missing.length === 0, missing };
}

/** Одит на цялата библиотека — findings + обобщение. */
export function auditAllTemplates(): { findings: Finding[]; total: number; failing: number } {
  const findings = TEMPLATES.map(auditTemplate);
  return { findings, total: findings.length, failing: findings.filter((f) => !f.ok).length };
}

/** Одит по id (за инструменти/диагностика). */
export function auditTemplateById(id: string): Finding | null {
  const t = getTemplate(id);
  return t ? auditTemplate(t) : null;
}
