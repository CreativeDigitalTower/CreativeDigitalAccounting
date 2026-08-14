/**
 * Чисти изчисления/валидации за курс (Shipment). Без странични ефекти → тествани.
 */

/**
 * Нето количество = бруто − тара (ако и двете са зададени и валидни). Ако е подадено
 * явно нето, то има приоритет. Връща null при липса на достатъчно данни.
 */
export function computeNet(
  gross: number | null | undefined,
  tara: number | null | undefined,
  explicitNet?: number | null | undefined
): number | null {
  if (explicitNet != null && Number.isFinite(explicitNet) && explicitNet > 0) {
    return round3(explicitNet);
  }
  if (gross != null && tara != null && Number.isFinite(gross) && Number.isFinite(tara)) {
    const net = gross - tara;
    return net > 0 ? round3(net) : null;
  }
  return null;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Валидация на входа за създаване на курс. Критични полета: дата, автомобил/рег, продукт, количество. */
export type ShipmentValidateInput = {
  dispatchDate?: string | null;
  vehicleId?: string | null;
  vehicleReg?: string | null;
  productId?: string | null;
  netQuantity?: number | null;
};

export function validateShipmentCore(i: ShipmentValidateInput): { ok: true } | { ok: false; error: string } {
  if (!i.dispatchDate) return { ok: false, error: "Липсва дата." };
  if (!i.vehicleId && !i.vehicleReg) return { ok: false, error: "Липсва автомобил." };
  if (!i.productId) return { ok: false, error: "Липсва продукт." };
  if (i.netQuantity == null || !(i.netQuantity > 0)) return { ok: false, error: "Количеството трябва да е положително." };
  return { ok: true };
}
