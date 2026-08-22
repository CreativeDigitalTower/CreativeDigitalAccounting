/**
 * Условия на доставка (Incoterm) за export доставката (§1). Чиста логика, тествана.
 * КРИТИЧНО (§4): FCA/CPT е Incoterm — НЕ определя дестинацията и НЕ е Враца.
 * deliveryTerm, placeOfShipment и destination са ТРИ отделни бизнес стойности (§14):
 *   - deliveryTerm : FCA | CPT
 *   - placeOfShipment : винаги „BELI IZVOR" (заводът за товарене, §2)
 *   - destination : крайната дестинация (избор/ръчно, независима от term-а, §5/§8)
 */
export const DELIVERY_TERMS = ["FCA", "CPT"] as const;
export type DeliveryTerm = (typeof DELIVERY_TERMS)[number];

/** Мястото на натоварване по подразбиране за този Cement workflow (§2). */
export const PLACE_OF_SHIPMENT_DEFAULT = "BELI IZVOR";

export function isDeliveryTerm(v: string | null | undefined): v is DeliveryTerm {
  return v === "FCA" || v === "CPT";
}

// Транслитерация за английската фактура (Terms of delivery / Destination).
const CYR2LAT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "z", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "c", ш: "s", щ: "s", ъ: "a", ю: "u", я: "a", ј: "j", ќ: "k", ѓ: "g", љ: "lj", њ: "nj", џ: "d" };
const DEST_EN_OVERRIDE: Record<string, string> = { скопие: "SKOPIE", скопjе: "SKOPIE", тетово: "TETOVO", "бели извор": "BELI IZVOR" };

/** Латинско (англ.) изписване на дестинация/място за фактурата. */
export function destinationEn(destination: string | null | undefined): string {
  const d = (destination ?? "").trim();
  if (!d) return "";
  const ov = DEST_EN_OVERRIDE[d.toLowerCase()];
  if (ov) return ov;
  return d.split("").map((ch) => CYR2LAT[ch.toLowerCase()] ? (ch === ch.toUpperCase() ? CYR2LAT[ch.toLowerCase()].toUpperCase() : CYR2LAT[ch.toLowerCase()]) : ch).join("").toUpperCase();
}

/** Terms of delivery за фактурата: „{TERM} {DEST_EN}" (§9). Fallback за legacy без term. */
export function invoiceDeliveryTerms(term: string | null | undefined, destination: string | null | undefined, legacyFallback: string): string {
  if (!isDeliveryTerm(term)) return legacyFallback;
  const dest = destinationEn(destination);
  return `${term}${dest ? ` ${dest}` : ""}`;
}
