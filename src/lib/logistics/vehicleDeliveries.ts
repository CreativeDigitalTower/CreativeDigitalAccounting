/**
 * Чиста логика за свързване на export доставки с автомобил в неговото досие (§30/§31).
 * Primary: truckVehicleId (FK). Legacy fallback: точен рег.номер/alias, но САМО когато
 * truckVehicleId липсва — за да не свързваме двусмислено (ambiguous → skip). Без destructive
 * backfill; само read-time matching. Функцията връща OR-условия за Prisma where.
 */
export type VehicleMatchClause =
  | { truckVehicleId: string }
  | { truckVehicleId: null; truckRegSnapshot: { in: string[] } };

export function buildVehicleDeliveryMatch(vehicleId: string, regVariants: (string | null | undefined)[]): { OR: VehicleMatchClause[] } {
  const variants = [...new Set(regVariants.filter((r): r is string => !!r && r.trim().length > 0))];
  const or: VehicleMatchClause[] = [{ truckVehicleId: vehicleId }];
  // Legacy: свързваме стар запис без truckVehicleId само при ТОЧНО съвпадение на рег.номер.
  if (variants.length) or.push({ truckVehicleId: null, truckRegSnapshot: { in: variants } });
  return { OR: or };
}

/** Активните (генерирани) типове документи, които се броят в „генерирани документи". */
export const GENERATED_DOC_TYPES = ["invoice", "dispatch", "declaration", "cmr_hp"] as const;

/** Брой генерирани документи (само активни типове) от списък docType-ове. */
export function countGeneratedDocs(docTypes: string[]): number {
  return docTypes.filter((d) => (GENERATED_DOC_TYPES as readonly string[]).includes(d)).length;
}
