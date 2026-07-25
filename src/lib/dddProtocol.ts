// ─────────────────────────────────────────────────────────────────────────
// Структура на „Протокол за ДДД обработка съгласно Наредба №1 на МЗ" —
// точно по официалния образец. Един източник за формата и за PDF-а.
// Съдържанието/подредбата НЕ се променят — само стойностите се попълват.
// ─────────────────────────────────────────────────────────────────────────

export const DDD_COLUMNS = [
  { id: "dez", label: "Дезинсекция и дезакаризация" },
  { id: "derat", label: "Дератизация" },
  { id: "dezinf", label: "Дезинфекция" },
] as const;
export type DddColId = (typeof DDD_COLUMNS)[number]["id"];

// Ред от таблицата: label + за кои колони има поле за попълване.
export type DddRow = { id: string; no: string; label: string; cols: DddColId[]; sub?: boolean };

export const DDD_ROWS: DddRow[] = [
  { id: "area", no: "2.", label: "Обработена площ (m2)", cols: ["dez", "derat", "dezinf"] },
  { id: "surfaceType", no: "3.", label: "Вид на обработените площи/помещения/повърхности:", cols: ["dez", "derat", "dezinf"] },
  { id: "treatmentType", no: "4.", label: "Вид на обработката (механична, физична, биологична, химична с биоцидни препарати):", cols: ["dez", "derat", "dezinf"] },
  { id: "nonChemical", no: "5.", label: "Наименование и брой на използваните нехимични средства: Брой и вид (убиващи, живоловни, лепливи) на използваните капани.*", cols: ["dez", "derat", "dezinf"] },
  { id: "biocideName", no: "6.", label: "Търговско наименование на биоцида:", cols: ["dez", "derat", "dezinf"] },
  { id: "permit", no: "7.", label: "Номер на разрешението за пускане на пазара на биоцида:", cols: ["dez", "derat", "dezinf"] },
  { id: "formulation", no: "8.", label: "Формулация на биоцида:", cols: ["dez", "derat", "dezinf"] },
  { id: "actives", no: "9.", label: "Наименование на активните вещества и концентрацията им в състава на биоцида:", cols: ["dez", "derat", "dezinf"] },
  { id: "workingSolution", no: "10.", label: "Информация за работния разтвор - концентрация и разходна норма:", cols: ["dez", "derat", "dezinf"] },
  { id: "totalAmount", no: "11.", label: "Общо количество изразходван препарат/работен разтвор. Брой на поставените/заредени дератизационни кутии* и количеството родентицид, заложено в една дератизационна кутия (g).", cols: ["dez", "derat", "dezinf"] },
  { id: "safety", no: "12.", label: "Указания за мерки за безопасност в обекта:", cols: [] },
  { id: "exposureTime", no: "12.1.", label: "Време на въздействие на биоцида:", cols: ["dez", "derat", "dezinf"], sub: true },
  { id: "access", no: "12.2.", label: "Достъп на хора и животни до обработените площи/повърхности. Време за проветряване на помещенията:", cols: ["dez", "derat", "dezinf"], sub: true },
  { id: "wipe", no: "12.3.", label: "Повърхности, подлежащи на забърсване/изплакване след изтичане времето на въздействие:", cols: ["dez", "derat", "dezinf"], sub: true },
  { id: "antidote", no: "12.4.", label: "Антидот", cols: ["dez", "derat", "dezinf"], sub: true },
  { id: "other", no: "12.5.", label: "Други", cols: ["dez", "derat", "dezinf"], sub: true },
  { id: "recommendations", no: "13.", label: "Препоръки към заявителя за подобряване на санитарно-хигиенните и технически условия в обекта, свързани с появата и разпространението на вредители:", cols: ["dez", "derat", "dezinf"] },
  { id: "corrections", no: "14.", label: "Наложили се промени и корекции на данните в протокола:", cols: ["dez", "derat", "dezinf"] },
];

// Ред 1 — вредители (чекбокс матрица) по колони, точно по образеца.
export const DDD_PESTS: Record<DddColId, string[]> = {
  dez: ["хлебарки", "мухи", "мравки", "комари", "бълхи", "оси", "дървеници", "кърлежи", "Други"],
  derat: ["сив плъх", "черен плъх", "домашна мишка", "Други"],
  dezinf: ["бактерицидно", "фунгицидно", "спороцидно", "вирусоцидно", "алгицидно"],
};

export type DddData = {
  applicant?: { name?: string; eik?: string; address?: string; mobile?: string };
  object?: { name?: string; contact?: string; address?: string };
  basis?: "single" | "contract";
  pests?: Partial<Record<DddColId, string[]>>;
  cells?: Record<string, string>; // ключ `${rowId}_${col}`
  footer?: { preparedBy?: string; certification?: string; performedBy?: string; executionMonth?: string };
};

export const cellKey = (rowId: string, col: DddColId) => `${rowId}_${col}`;
