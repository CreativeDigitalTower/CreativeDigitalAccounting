/**
 * Мапинг Company (DB) → Party за export документи. Пази English legal snapshot-а
 * (nameEn/addressEn/cityEn/countryEn), управителя (mol) и BG стойностите като fallback.
 * Не променя вътрешните данни на фирмата — само ги подготвя за document layer.
 */
import type { Party } from "@/lib/logistics/exportDocs";

export type CompanyExportRow = {
  name: string; address: string | null; city: string | null; country: string | null;
  eik: string | null; registrationNumber: string | null; vatNumber: string | null;
  mol?: string | null;
  nameEn?: string | null; addressEn?: string | null; cityEn?: string | null; countryEn?: string | null;
};

/** Полетата за select при зареждане на фирма за export (BG + English snapshot + mol). */
export const COMPANY_EXPORT_SELECT = {
  name: true, address: true, city: true, country: true, eik: true, registrationNumber: true,
  vatNumber: true, mol: true, nameEn: true, addressEn: true, cityEn: true, countryEn: true,
} as const;

export function toExportParty(c: CompanyExportRow | null): Party {
  if (!c) return { name: null };
  return {
    name: c.name, address: c.address, city: c.city, country: c.country,
    eik: c.eik, registrationNumber: c.registrationNumber, vatNumber: c.vatNumber,
    manager: c.mol ?? null,
    nameEn: c.nameEn ?? null, addressEn: c.addressEn ?? null, cityEn: c.cityEn ?? null, countryEn: c.countryEn ?? null,
  };
}
