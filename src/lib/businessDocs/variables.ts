// Централизирана библиотека с динамични променливи за модул „Бизнес документи".
// Добавянето на нова променлива тук я прави достъпна за всички шаблони.

export type VariableContext = {
  company?: {
    name?: string | null; eik?: string | null; vatNumber?: string | null;
    address?: string | null; city?: string | null; phone?: string | null;
    email?: string | null; mol?: string | null;
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
  "Доставчик.Име": "Име на доставчика",
  "Доставчик.ЕИК": "ЕИК на доставчика",
  "Служител.Име": "Име на служителя",
  "Служител.Длъжност": "Длъжност на служителя",
  "Служител.ЕГН": "ЕГН на служителя",
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
  const now = ctx.docDate ?? new Date();
  return {
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
