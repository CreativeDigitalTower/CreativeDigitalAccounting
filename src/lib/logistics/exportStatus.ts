import type { Prisma } from "@prisma/client";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";

/**
 * DERIVED статус на експортна доставка (§ status UX). Не се пази в базата и не се
 * задава ръчно — извежда се от РЕАЛНИТЕ ExportDocument статуси. Историческите доставки
 * автоматично получават коректно състояние без backfill.
 *
 * Използват се САМО активните/изисквани типове документи (ACTIVE_EXPORT_DOC_TYPES):
 * временно изключеният CMR Epson НЕ участва и не блокира „Финализирана".
 *
 *   no_docs      → няма нито един генериран активен документ
 *   draft        → има документи, но нито един не е финализиран
 *   in_progress  → част от активните документи са финализирани
 *   finalized    → и четирите изисквани активни документа са финализирани
 */
export type DerivedExportStatus = "no_docs" | "draft" | "in_progress" | "finalized";

export const DERIVED_EXPORT_STATUSES: readonly DerivedExportStatus[] = ["no_docs", "draft", "in_progress", "finalized"] as const;

type DocLite = { docType: string; status: string };

export function deriveExportSetStatus(docs: readonly DocLite[]): DerivedExportStatus {
  const active = docs.filter((d) => isActiveExportDocType(d.docType));
  if (active.length === 0) return "no_docs";
  // Уникални типове, чийто активен документ е финализиран (без двойно броене).
  const finalizedTypes = new Set(active.filter((d) => d.status === "finalized").map((d) => d.docType));
  if (finalizedTypes.size === 0) return "draft";
  const allFinalized = ACTIVE_EXPORT_DOC_TYPES.every((t) => finalizedTypes.has(t));
  return allFinalized ? "finalized" : "in_progress";
}

/** Брой финализирани изисквани активни документи (за tooltip „X от Y"). */
export function finalizedActiveCount(docs: readonly DocLite[]): number {
  const types = new Set(docs.filter((d) => isActiveExportDocType(d.docType) && d.status === "finalized").map((d) => d.docType));
  let n = 0;
  for (const t of ACTIVE_EXPORT_DOC_TYPES) if (types.has(t)) n++;
  return n;
}

/**
 * Prisma `where` фрагмент за server-side филтриране по DERIVED статус — коректен с
 * pagination и без N+1 (изразява се чрез relation `some`/`none`). Връща undefined за
 * непозната/празна стойност (= „всички статуси").
 */
export function derivedStatusFilter(key: string): Prisma.ExportDocumentSetWhereInput | undefined {
  const inActive = { in: ACTIVE_EXPORT_DOC_TYPES as unknown as string[] };
  const anyActive: Prisma.ExportDocumentSetWhereInput = { documents: { some: { docType: inActive } } };
  const noneActive: Prisma.ExportDocumentSetWhereInput = { documents: { none: { docType: inActive } } };
  const noFinalized: Prisma.ExportDocumentSetWhereInput = { documents: { none: { docType: inActive, status: "finalized" } } };
  const anyFinalized: Prisma.ExportDocumentSetWhereInput = { documents: { some: { docType: inActive, status: "finalized" } } };
  // „Финализирана" = всеки изискван активен тип има финализиран документ.
  const allFinalized: Prisma.ExportDocumentSetWhereInput = {
    AND: ACTIVE_EXPORT_DOC_TYPES.map((docType) => ({ documents: { some: { docType, status: "finalized" } } })),
  };
  switch (key) {
    case "no_docs": return noneActive;
    case "draft": return { AND: [anyActive, noFinalized] };
    case "in_progress": return { AND: [anyFinalized, { NOT: allFinalized }] };
    case "finalized": return allFinalized;
    default: return undefined;
  }
}
