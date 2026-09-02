/**
 * Чиста логика за creatable избор на автомобил в „Нова експортна доставка" (§2/§6/§7).
 * SearchableSelect с allowCreate връща или id на съществуващ автомобил, или ВЪВЕДЕНИЯ
 * текст (нова регистрация). Тук решаваме кое от двете е.
 */
export function isNewVehicleRegistration(value: string, existingIds: readonly string[]): boolean {
  return value.trim().length > 0 && !existingIds.includes(value);
}

/** Payload за POST /api/logistics/vehicles — само поддържаните от текущия endpoint полета. */
export type VehicleQuickCreateInput = { registration: string; trailerReg?: string; carrierId?: string; defaultDriver?: string; ownershipType?: string };
export function buildVehicleQuickCreatePayload(i: VehicleQuickCreateInput): Record<string, unknown> {
  return {
    registration: i.registration.trim(),
    trailerReg: i.trailerReg?.trim() || null,
    carrierId: i.carrierId || null,
    defaultDriver: i.defaultDriver?.trim() || null,
    ownershipType: i.ownershipType || "unspecified",
  };
}
