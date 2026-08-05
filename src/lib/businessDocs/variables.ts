// Централизирана библиотека с динамични променливи за модул „Бизнес документи".
// Добавянето на нова променлива тук я прави достъпна за всички шаблони.

export type VariableContext = {
  company?: {
    name?: string | null; eik?: string | null; vatNumber?: string | null;
    address?: string | null; city?: string | null; phone?: string | null;
    email?: string | null; mol?: string | null;
  } | null;
  client?: {
    name?: string | null; eik?: string | null; vatNumber?: string | null;
    address?: string | null; city?: string | null; phone?: string | null;
    contactEmail?: string | null; mol?: string | null; contactPerson?: string | null;
  } | null;
  // Служител — за HR документи (трудов/граждански договор, длъжностна
  // характеристика, заповеди, допълнителни споразумения и т.н.).
  employee?: {
    name?: string | null; position?: string | null; department?: string | null;
    address?: string | null; phone?: string | null; email?: string | null;
    hiredAt?: Date | string | null; salary?: number | null;
    iban?: string | null; bankName?: string | null;
  } | null;
  // Доставчик — за документи към доставчици (заявки, поръчки, договори).
  supplier?: {
    name?: string | null; eik?: string | null; vatNumber?: string | null;
    address?: string | null; city?: string | null; phone?: string | null;
    contactEmail?: string | null; contactPerson?: string | null;
  } | null;
  docNumber?: string;
  docDate?: Date;
};

// Приятелски етикети на променливите (за списъци и за placeholder, ако липсва стойност)
export const VARIABLE_LABELS: Record<string, string> = {
  "Фирма.Име": "Име на фирмата",
  "Фирма.ЕИК": "ЕИК",
  "Фирма.ДДС": "ДДС номер",
  "Фирма.Адрес": "Адрес на фирмата",
  "Фирма.Град": "Град",
  "Фирма.Телефон": "Телефон",
  "Фирма.Email": "Имейл",
  "Фирма.Управител": "Управител / МОЛ",
  "Клиент.Име": "Име на клиента",
  "Клиент.ЕИК": "ЕИК на клиента",
  "Клиент.Адрес": "Адрес на клиента",
  "Клиент.МОЛ": "МОЛ на клиента",
  "Клиент.Телефон": "Телефон на клиента",
  "Клиент.Email": "Имейл на клиента",
  "Клиент.ЛицеЗаКонтакт": "Лице за контакт",
  "Доставчик.Име": "Име на доставчика",
  "Доставчик.ЕИК": "ЕИК на доставчика",
  "Служител.Име": "Име на служителя",
  "Служител.Длъжност": "Длъжност на служителя",
  "Служител.ЕГН": "ЕГН на служителя",
  "Служител.Отдел": "Отдел / звено",
  "Служител.Адрес": "Адрес на служителя",
  "Служител.Телефон": "Телефон на служителя",
  "Служител.Email": "Имейл на служителя",
  "Служител.ДатаНазначаване": "Дата на назначаване",
  "Служител.Възнаграждение": "Възнаграждение",
  "Служител.ЛичнаКарта": "Лична карта",
  "Служител.РаботноВреме": "Работно време",
  "Служител.IBAN": "IBAN на служителя",
  "Служител.Банка": "Банка на служителя",
  "Доставчик.ДДС": "ДДС номер на доставчика",
  "Доставчик.Адрес": "Адрес на доставчика",
  "Доставчик.МОЛ": "МОЛ на доставчика",
  "Доставчик.Телефон": "Телефон на доставчика",
  "Доставчик.Email": "Имейл на доставчика",
  "Доставчик.ЛицеЗаКонтакт": "Лице за контакт (доставчик)",
  "Проект.Име": "Име на проекта",
  "Документ.Номер": "Номер на документа",
  "Документ.Дата": "Дата на документа",
  "ТекущаДата": "Текуща дата",
  "ТекущаГодина": "Текуща година",
  "Място": "Място (град)",
  "Сума": "Сума",
  "Предмет": "Предмет",
  "Срок": "Срок",
};

// Кои променливи се попълват автоматично от профила на фирмата
export const COMPANY_VARS = [
  "Фирма.Име", "Фирма.ЕИК", "Фирма.ДДС", "Фирма.Адрес", "Фирма.Град", "Фирма.Телефон", "Фирма.Email", "Фирма.Управител",
  "Документ.Номер", "Документ.Дата", "ТекущаДата", "ТекущаГодина", "Място",
];

function fmtDate(d: Date) { return d.toLocaleDateString("bg-BG"); }

export function resolveVariables(ctx: VariableContext): Record<string, string> {
  const c = ctx.company ?? {};
  const cl = ctx.client ?? {};
  const e = ctx.employee ?? {};
  const s = ctx.supplier ?? {};
  const now = ctx.docDate ?? new Date();
  const money = (n?: number | null) => (n != null ? new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : "");
  const dt = (d?: Date | string | null) => (d ? fmtDate(new Date(d)) : "");
  return {
    "Клиент.Име": cl.name ?? "",
    "Клиент.ЕИК": cl.eik ?? "",
    "Клиент.Адрес": [cl.address, cl.city].filter(Boolean).join(", "),
    "Клиент.МОЛ": cl.mol ?? cl.contactPerson ?? "",
    "Клиент.Телефон": cl.phone ?? "",
    "Клиент.Email": cl.contactEmail ?? "",
    "Клиент.ЛицеЗаКонтакт": cl.contactPerson ?? "",
    // Служител (HR) — ЕГН/лична карта/работно време не се пазят в профила и остават
    // за ръчно попълване (визуален индикатор), останалото се попълва автоматично.
    "Служител.Име": e.name ?? "",
    "Служител.Длъжност": e.position ?? "",
    "Служител.Отдел": e.department ?? "",
    "Служител.Адрес": e.address ?? "",
    "Служител.Телефон": e.phone ?? "",
    "Служител.Email": e.email ?? "",
    "Служител.ДатаНазначаване": dt(e.hiredAt),
    "Служител.Възнаграждение": money(e.salary),
    "Служител.IBAN": e.iban ?? "",
    "Служител.Банка": e.bankName ?? "",
    // Доставчик
    "Доставчик.Име": s.name ?? "",
    "Доставчик.ЕИК": s.eik ?? "",
    "Доставчик.ДДС": s.vatNumber ?? "",
    "Доставчик.Адрес": [s.address, s.city].filter(Boolean).join(", "),
    "Доставчик.МОЛ": s.contactPerson ?? "",
    "Доставчик.ЛицеЗаКонтакт": s.contactPerson ?? "",
    "Доставчик.Телефон": s.phone ?? "",
    "Доставчик.Email": s.contactEmail ?? "",
    "Фирма.Име": c.name ?? "",
    "Фирма.ЕИК": c.eik ?? "",
    "Фирма.ДДС": c.vatNumber ?? "",
    "Фирма.Адрес": c.address ?? "",
    "Фирма.Град": c.city ?? "",
    "Фирма.Телефон": c.phone ?? "",
    "Фирма.Email": c.email ?? "",
    "Фирма.Управител": c.mol ?? "",
    "Документ.Номер": ctx.docNumber ?? "",
    "Документ.Дата": fmtDate(now),
    "ТекущаДата": fmtDate(now),
    "ТекущаГодина": String(now.getFullYear()),
    "Място": c.city ?? "",
  };
}

/**
 * Заменя {{Променлива}} със стойност. Ако стойността липсва (или променливата е
 * за ръчно попълване), оставя визуален индикатор за попълване.
 */
export function applyVariables(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, rawKey: string) => {
    const key = rawKey.trim();
    const val = vars[key];
    if (val !== undefined && val !== "") return escapeHtml(val);
    const label = VARIABLE_LABELS[key] ?? key;
    return `<span class="cda-fill" style="background:#FCEFC7;border-bottom:1px dashed #A5812E;padding:0 3px;border-radius:2px;">[${escapeHtml(label)}]</span>`;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
