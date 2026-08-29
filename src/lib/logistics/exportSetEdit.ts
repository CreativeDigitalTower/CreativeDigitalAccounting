/**
 * Чиста логика за редакция/изтриване на експортна доставка (без DB) — тествана изолирано
 * и споделена от API-то, за да няма разминаване между тестове и реалния код.
 */

// Полетата, които НЕ бива да бъдат изпразвани при частична редакция (§18/§27). Проверяваме
// само ключове, които реално са подадени (partial PATCH), но със стойност, която ги трие.
export type EditPayload = {
  invoiceNumber?: string;
  deliveryTerm?: string | null;
  destination?: string | null;
  placeOfShipment?: string | null;
  quantity?: number | null;
  logisticsProductId?: string | null;
  truckVehicleId?: string | null;
};

export type EditRequiredField = "invoiceNumber" | "deliveryTerm" | "destination" | "placeOfShipment" | "quantity" | "logisticsProductId" | "truckVehicleId";

/** Кои подадени задължителни полета са изпразнени/невалидни (за structured грешка). */
export function missingEditFields(d: EditPayload): EditRequiredField[] {
  const out: EditRequiredField[] = [];
  if (d.invoiceNumber !== undefined && !d.invoiceNumber.trim()) out.push("invoiceNumber");
  if (d.deliveryTerm !== undefined && !d.deliveryTerm) out.push("deliveryTerm");
  if (d.destination !== undefined && !(d.destination ?? "").trim()) out.push("destination");
  if (d.placeOfShipment !== undefined && !(d.placeOfShipment ?? "").trim()) out.push("placeOfShipment");
  if (d.quantity !== undefined && (d.quantity == null || !(d.quantity > 0))) out.push("quantity");
  if (d.logisticsProductId !== undefined && !d.logisticsProductId) out.push("logisticsProductId");
  if (d.truckVehicleId !== undefined && !d.truckVehicleId) out.push("truckVehicleId");
  return out;
}

/**
 * Решение дали изтриването е позволено (§4/§6): ако вече има издадена MK фактура от тази
 * доставка → блокирай, за да няма фактура без източник. Иначе → позволи (soft delete).
 */
export type DeleteDecision = { ok: true } | { ok: false; reason: "mk_invoice_linked" };

export function exportDeleteDecision(opts: { hasMkInvoice: boolean }): DeleteDecision {
  return opts.hasMkInvoice ? { ok: false, reason: "mk_invoice_linked" } : { ok: true };
}

/** Дали доставка е видима в даден изглед: активни (deletedAt=null) vs Кошче (§7/§30). */
export function setVisibleInView(set: { deletedAt: Date | string | null }, view: "active" | "trash"): boolean {
  const trashed = set.deletedAt != null;
  return view === "trash" ? trashed : !trashed;
}
