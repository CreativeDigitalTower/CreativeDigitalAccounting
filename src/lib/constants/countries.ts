/**
 * Държави за фирмена регистрация (ISO2 + име + предложена валута по подразбиране).
 * Разширяемо — добавянето на държава не изисква промяна по логиката.
 */
export type CountryOption = { code: string; name: string; currency: string };

export const COMPANY_COUNTRIES: CountryOption[] = [
  { code: "BG", name: "България", currency: "BGN" },
  { code: "MK", name: "Северна Македония", currency: "MKD" },
  { code: "RS", name: "Сърбия", currency: "RSD" },
  { code: "GR", name: "Гърция", currency: "EUR" },
  { code: "RO", name: "Румъния", currency: "RON" },
  { code: "TR", name: "Türkiye", currency: "TRY" },
  { code: "DE", name: "Германия", currency: "EUR" },
  { code: "IT", name: "Италия", currency: "EUR" },
  { code: "AT", name: "Австрия", currency: "EUR" },
  { code: "US", name: "САЩ", currency: "USD" },
  { code: "GB", name: "Обединено кралство", currency: "GBP" },
  { code: "OTHER", name: "Друга държава", currency: "EUR" },
];

export function countryByCode(code: string | null | undefined): CountryOption | undefined {
  const c = (code ?? "").toUpperCase();
  return COMPANY_COUNTRIES.find((x) => x.code === c);
}

/** Предложена валута по подразбиране за държава (не заключва — само предложение). */
export function suggestedCurrency(code: string | null | undefined): string {
  return countryByCode(code)?.currency ?? "EUR";
}
