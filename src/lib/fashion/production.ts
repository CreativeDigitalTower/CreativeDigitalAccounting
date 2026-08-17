/**
 * Чиста логика за производствени поръчки (Production Order) — workflow + суми (§14).
 * Без DB, тестируемо изолирано.
 */

/** Основен производствен поток. */
export const WORKFLOW_ORDER = ["cut", "sewing", "finishing", "qc", "ready"] as const;
export type WorkflowStatus = (typeof WORKFLOW_ORDER)[number];

/** Всички статуси (поток + странични). */
export const PRODUCTION_STATUSES = [...WORKFLOW_ORDER, "on_hold", "rework", "cancelled"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

const isWorkflow = (s: string): s is WorkflowStatus => (WORKFLOW_ORDER as readonly string[]).includes(s);

/**
 * Допустим ли е преходът between статуси:
 *  - поток напред с една стъпка (cut→sewing→…→ready);
 *  - всеки активен статус → on_hold / cancelled;
 *  - on_hold → всеки статус от потока (възобновяване);
 *  - finishing/qc/ready → rework; rework → sewing/finishing/qc;
 *  - cancelled е терминален.
 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return false;
  if (!PRODUCTION_STATUSES.includes(to as ProductionStatus)) return false;
  if (from === "cancelled") return false;
  if (to === "cancelled") return true;
  if (to === "on_hold") return isWorkflow(from) || from === "rework";
  if (from === "on_hold") return isWorkflow(to);
  if (to === "rework") return from === "finishing" || from === "qc" || from === "ready";
  if (from === "rework") return to === "sewing" || to === "finishing" || to === "qc";
  if (isWorkflow(from) && isWorkflow(to)) {
    return WORKFLOW_ORDER.indexOf(to) === WORKFLOW_ORDER.indexOf(from) + 1;
  }
  return false;
}

/** Позволените следващи статуси от даден текущ (за UI бутони). */
export function nextStatuses(from: string): ProductionStatus[] {
  return PRODUCTION_STATUSES.filter((s) => canTransition(from, s));
}

export type PoLine = { size: string; cutQuantity: number };
/** Общо скроени бройки в поръчката. */
export function productionCut(lines: PoLine[]): number {
  return lines.reduce((s, l) => s + (l.cutQuantity || 0), 0);
}
