/** Каноничното име/адрес на „SEM INTERNATIONAL DOOEL" + разпознаване на typo вариантите (§6). Pure. */
import { nameKey } from "@/lib/logistics/nameMatch";

export const SEM_CANON = {
  name: "SEM INTERNATIONAL DOOEL",
  address: "55 Marshal Tito Str.",
  city: "Tetovo",
  country: "North Macedonia",
};

/** Дали името е (грешен) вариант на „Сем Интернационал" (вкл. „JOUEL"/„INIERNAIIONAL"). */
export function isSemInternational(name: string | null | undefined): boolean {
  const k = nameKey(name);
  if (!k.startsWith("sem")) return false;
  return k.includes("internation") || k.includes("internacion") || k.includes("inernaion")
    || k.includes("inernaiion") || k.includes("dooel") || k.includes("jouel");
}
