/**
 * Чисти помощни функции за транспортното проследяване и досието на вноса. Тествани.
 * Закъснението се ИЗЧИСЛЯВА; реалният статус НЕ се променя автоматично (раздел 22).
 */
import { REQUIRED_IMPORT_DOCS, DELAY_GRACE_MINUTES, type ShipmentDocType } from "@/lib/logistics/config";

export type MilestoneState = "pending" | "confirmed" | "delayed" | "none";

export type MilestoneInput = {
  expectedFrom?: Date | string | null;
  expectedTo?: Date | string | null;
  actualAt?: Date | string | null;
};

/**
 * Състояние на етап:
 *  - „confirmed" ако има реален час (actualAt);
 *  - „delayed" ако няма реален час и now > expectedTo + grace;
 *  - „pending" ако има очакван диапазон, но още не е потвърден/закъснял;
 *  - „none" ако няма нито очаквано, нито реално.
 */
export function milestoneState(m: MilestoneInput, now: Date = new Date(), graceMinutes = DELAY_GRACE_MINUTES): MilestoneState {
  if (m.actualAt) return "confirmed";
  if (!m.expectedTo && !m.expectedFrom) return "none";
  if (m.expectedTo) {
    const deadline = new Date(m.expectedTo).getTime() + graceMinutes * 60 * 1000;
    if (now.getTime() >= deadline) return "delayed";
  }
  return "pending";
}

/** Дали курсът има поне един закъснял етап. */
export function shipmentDelayed(milestones: MilestoneInput[], now: Date = new Date(), graceMinutes = DELAY_GRACE_MINUTES): boolean {
  return milestones.some((m) => milestoneState(m, now, graceMinutes) === "delayed");
}

export type DossierItem = { docType: ShipmentDocType; present: boolean };
export type DossierStatus = { items: DossierItem[]; missing: ShipmentDocType[]; complete: boolean };

/**
 * Досие на вноса: за всеки изискван вид документ → наличен ли е. Пълно = всички налични.
 */
export function importDossierStatus(
  presentTypes: Array<string | null | undefined>,
  required: ShipmentDocType[] = REQUIRED_IMPORT_DOCS
): DossierStatus {
  const present = new Set(presentTypes.filter(Boolean) as string[]);
  const items = required.map((docType) => ({ docType, present: present.has(docType) }));
  const missing = items.filter((i) => !i.present).map((i) => i.docType);
  return { items, missing, complete: missing.length === 0 };
}
