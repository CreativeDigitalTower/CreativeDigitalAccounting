/**
 * Условия на доставка (Incoterm) за export доставката (§1). Чиста логика, тествана.
 * FCA → товарът се предава в завода във Враца → дестинация = Враца (§2).
 * CPT → крайна дестинация в Северна Македония (избор/ръчно, §3/§4).
 */
export const DELIVERY_TERMS = ["FCA", "CPT"] as const;
export type DeliveryTerm = (typeof DELIVERY_TERMS)[number];

/** Каноничната FCA дестинация (заводът във Враца). */
export const FCA_DESTINATION = "Враца";

export function isDeliveryTerm(v: string | null | undefined): v is DeliveryTerm {
  return v === "FCA" || v === "CPT";
}

/**
 * Крайната дестинация според условията: FCA → винаги Враца; CPT → подадената
 * (избрана/ръчна). Ползва се при create/edit на доставката (snapshot).
 */
export function resolveDestination(term: string | null | undefined, destination: string | null | undefined): string | null {
  if (term === "FCA") return FCA_DESTINATION;
  const d = (destination ?? "").trim();
  return d || null;
}

// Транслитерация за английската фактура (Terms of delivery: „FCA VRATSA" / „CPT SKOPIE").
const CYR2LAT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "z", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "c", ш: "s", щ: "s", ъ: "a", ю: "u", я: "a", ј: "j", ќ: "k", ѓ: "g", љ: "lj", њ: "nj", џ: "d" };
const DEST_EN_OVERRIDE: Record<string, string> = { враца: "VRATSA", скопие: "SKOPIE", скопjе: "SKOPIE", тетово: "TETOVO" };

/** Латинско (英) изписване на дестинацията за фактурата. */
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
  const dest = destinationEn(resolveDestination(term, destination));
  return `${term}${dest ? ` ${dest}` : ""}`;
}
