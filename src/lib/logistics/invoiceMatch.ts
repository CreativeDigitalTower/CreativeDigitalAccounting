/**
 * Съпоставяне на invoice line ↔ Shipment (чисто, тествано).
 *
 * PRIMARY identifier: доставчик + номер на експедиционна бележка (раздел 6). Автомобилът
 * НЕ е primary (един камион има много курсове). Truck/материал/количество се ползват само
 * за ВАЛИДАЦИЯ → предупреждения, без автоматична промяна на курса (раздел 9, 14).
 */
import { normalizeRegistration, normalizeMaterialCode } from "@/lib/logistics/normalize";
import { differsBeyond } from "@/lib/logistics/money";

export type ShipmentForMatch = {
  dispatchNoteNumber: string | null;
  registration: string | null;      // рег. номер на курса (snapshot)
  materialCode: string | null;      // material code на продукта на курса
  netQuantity: number | null;
};
export type InvoiceLineForMatch = {
  dispatchNoteNumber?: string | null;
  truck?: string | null;
  materialCode?: string | null;
  quantity?: number | null;
};

export type MatchWarnings = { truck: boolean; material: boolean; quantity: boolean };
export type MatchResult = { primaryMatch: boolean; warnings: MatchWarnings; hasWarning: boolean };

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/**
 * Съпоставя ред от Holcim фактура към избран курс. Връща дали primary съвпада
 * (по експедиционна бележка) и предупреждения по truck/материал/количество.
 */
export function matchInvoiceLine(shipment: ShipmentForMatch, line: InvoiceLineForMatch): MatchResult {
  const primaryMatch = line.dispatchNoteNumber == null
    ? true // курсът е избран директно → primary е присъщ
    : norm(line.dispatchNoteNumber) === norm(shipment.dispatchNoteNumber);

  const warnings: MatchWarnings = {
    truck: line.truck != null && normalizeRegistration(line.truck) !== normalizeRegistration(shipment.registration ?? ""),
    material: line.materialCode != null && normalizeMaterialCode(line.materialCode) !== normalizeMaterialCode(shipment.materialCode ?? ""),
    quantity: line.quantity != null && differsBeyond(line.quantity, shipment.netQuantity, 0.001),
  };
  const hasWarning = warnings.truck || warnings.material || warnings.quantity;
  return { primaryMatch, warnings, hasWarning };
}

export type MatchStatus = "matched" | "review" | "unmatched";

/**
 * Статус на реда спрямо намерен курс (без да блокира записа):
 *  - няма курс           → "unmatched" (○ Няма намерена експедиция)
 *  - курс + без разлики   → "matched"   (✓ Свързана експедиция)
 *  - курс + разлика       → "review"    (⚠ Необходимо е преглеждане)
 */
export function matchStatusFor(shipment: ShipmentForMatch | null, line: InvoiceLineForMatch): MatchStatus {
  if (!shipment) return "unmatched";
  const r = matchInvoiceLine(shipment, line);
  if (!r.primaryMatch) return "unmatched";
  return r.hasWarning ? "review" : "matched";
}

/**
 * Разпознаване на продукт по material code (раздел 17). Връща id на съществуващ
 * продукт или null → изисква ревю (не създава автоматично продукт).
 */
export function resolveProductByMaterialCode(
  materialCode: string | null | undefined,
  products: Array<{ id: string; materialCode: string | null }>
): string | null {
  if (!materialCode) return null;
  const key = normalizeMaterialCode(materialCode);
  const hit = products.find((p) => p.materialCode && normalizeMaterialCode(p.materialCode) === key);
  return hit?.id ?? null;
}
