// ─────────────────────────────────────────────────────────────────────────
// Единна логика за подреждане на документи (фактури, проформи, кредитни/дебитни
// известия, оферти и др.). Използва се НАВСЯКЪДЕ, за да е консистентно.
//
// Подразбиране: дата на издаване ↓, после номер ↓ (числово), после createdAt ↓.
// Така стари въведени документи застават на правилното си място в хронологията,
// а не според момента на въвеждане.
// ─────────────────────────────────────────────────────────────────────────

import type { Prisma } from "@prisma/client";

/** Prisma orderBy за подразбиране (DB ниво). Номерата са нулево-подплатени, така
 *  че низовото desc съвпада с числовото в рамките на тип. Финалната числова
 *  прецизност се гарантира от компаратора при рендиране. */
export const DOC_ORDER: Prisma.DocumentOrderByWithRelationInput[] = [
  { issueDate: "desc" },
  { number: "desc" },
  { createdAt: "desc" },
];

/** Числова стойност на номер на документ (пренебрегва префикси/нули). */
export function docNumberValue(number: string): number {
  const digits = (number || "").replace(/\D/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export type SortableDoc = {
  issueDate: string | Date;
  number: string;
  createdAt?: string | Date | null;
  dueDate?: string | Date | null;
  clientName?: string | null;
  total?: number;
  status?: string;
};

export type SortKey =
  | "issue_desc" | "issue_asc"
  | "number_desc" | "number_asc"
  | "due_desc" | "due_asc"
  | "client_asc" | "client_desc"
  | "value_desc" | "value_asc"
  | "status";

export const DEFAULT_SORT: SortKey = "issue_desc";

/** Списък с опции за падащото меню (label през i18n ключ `documents.sort.*`). */
export const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: "issue_desc", labelKey: "documents.sort.issueDesc" },
  { key: "issue_asc", labelKey: "documents.sort.issueAsc" },
  { key: "number_desc", labelKey: "documents.sort.numberDesc" },
  { key: "number_asc", labelKey: "documents.sort.numberAsc" },
  { key: "due_desc", labelKey: "documents.sort.dueDesc" },
  { key: "due_asc", labelKey: "documents.sort.dueAsc" },
  { key: "client_asc", labelKey: "documents.sort.clientAsc" },
  { key: "client_desc", labelKey: "documents.sort.clientDesc" },
  { key: "value_desc", labelKey: "documents.sort.valueDesc" },
  { key: "value_asc", labelKey: "documents.sort.valueAsc" },
  { key: "status", labelKey: "documents.sort.status" },
];

const time = (v: string | Date | null | undefined): number => (v ? new Date(v).getTime() : 0);

/** Подразбиращ се компаратор: дата ↓, номер ↓ (числово), createdAt ↓. */
export function compareByDefault(a: SortableDoc, b: SortableDoc): number {
  const d = time(b.issueDate) - time(a.issueDate);
  if (d) return d;
  const n = docNumberValue(b.number) - docNumberValue(a.number);
  if (n) return n;
  return time(b.createdAt) - time(a.createdAt);
}

function collator(): Intl.Collator {
  return new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
}

/** Сортира копие на масива според избрания ключ; при равенство ползва подразбиране. */
export function sortDocs<T extends SortableDoc>(docs: T[], key: SortKey = DEFAULT_SORT): T[] {
  const col = collator();
  const arr = [...docs];
  const tie = (a: T, b: T) => compareByDefault(a, b);
  switch (key) {
    case "issue_asc": return arr.sort((a, b) => (time(a.issueDate) - time(b.issueDate)) || -tie(a, b));
    case "number_desc": return arr.sort((a, b) => (docNumberValue(b.number) - docNumberValue(a.number)) || tie(a, b));
    case "number_asc": return arr.sort((a, b) => (docNumberValue(a.number) - docNumberValue(b.number)) || -tie(a, b));
    case "due_desc": return arr.sort((a, b) => (time(b.dueDate) - time(a.dueDate)) || tie(a, b));
    case "due_asc": return arr.sort((a, b) => (time(a.dueDate) - time(b.dueDate)) || -tie(a, b));
    case "client_asc": return arr.sort((a, b) => col.compare(a.clientName ?? "", b.clientName ?? "") || tie(a, b));
    case "client_desc": return arr.sort((a, b) => col.compare(b.clientName ?? "", a.clientName ?? "") || tie(a, b));
    case "value_desc": return arr.sort((a, b) => ((b.total ?? 0) - (a.total ?? 0)) || tie(a, b));
    case "value_asc": return arr.sort((a, b) => ((a.total ?? 0) - (b.total ?? 0)) || tie(a, b));
    case "status": return arr.sort((a, b) => col.compare(a.status ?? "", b.status ?? "") || tie(a, b));
    case "issue_desc":
    default: return arr.sort(tie);
  }
}
