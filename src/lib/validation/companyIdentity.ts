/**
 * Валидация на фирмена идентичност според държава (BG vs международна).
 *
 * BG (countryCode = "BG" или липсва → по подразбиране BG): изисква валиден ЕИК/БУЛСТАТ
 * (българският checksum). Международна фирма: изисква национален регистрационен номер,
 * БЕЗ български checksum — не се налага фиктивен ЕИК.
 */
import { validateEik } from "@/lib/validation/eik";

/** Държава по подразбиране (за обратна съвместимост съществуващите BG фирми). */
export const DEFAULT_COUNTRY_CODE = "BG";

/** Нормализира ISO2 код: главни, само букви; празно → BG (backward-compatible). */
export function normalizeCountryCode(input: string | null | undefined): string {
  const c = (input ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return c || DEFAULT_COUNTRY_CODE;
}

export function isBulgarianCompany(countryCode: string | null | undefined): boolean {
  return normalizeCountryCode(countryCode) === "BG";
}

/**
 * Нормализира международен регистрационен номер: trim, свива интервали. Позволява
 * букви, цифри и разумни разделители; пази оригиналната стойност (без checksum).
 */
export function normalizeRegistrationNumber(input: string | null | undefined): string {
  return (input ?? "").trim().replace(/\s+/g, " ");
}

export type CompanyIdentityInput = {
  countryCode?: string | null;
  eik?: string | null;
  registrationNumber?: string | null;
};
export type CompanyIdentityResult =
  | { ok: true; countryCode: string; isBg: boolean; eik: string | null; registrationNumber: string | null }
  | { ok: false; error: string; field: "eik" | "registrationNumber" };

/**
 * Валидира идентичността. `requireIdentifier` = дали идентификаторът е задължителен
 * (true при създаване; при редакция може да е false за частична редакция).
 */
export function validateCompanyIdentity(input: CompanyIdentityInput, opts: { requireIdentifier?: boolean } = {}): CompanyIdentityResult {
  const requireIdentifier = opts.requireIdentifier ?? true;
  const countryCode = normalizeCountryCode(input.countryCode);
  const isBg = countryCode === "BG";

  if (isBg) {
    const raw = (input.eik ?? "").trim();
    if (!raw) {
      return requireIdentifier
        ? { ok: false, error: "Невалиден ЕИК/БУЛСТАТ", field: "eik" }
        : { ok: true, countryCode, isBg, eik: null, registrationNumber: null };
    }
    const check = validateEik(raw);
    if (!check.isValid) return { ok: false, error: check.error ?? "Невалиден ЕИК/БУЛСТАТ", field: "eik" };
    return { ok: true, countryCode, isBg, eik: check.normalized, registrationNumber: null };
  }

  // Международна фирма
  const reg = normalizeRegistrationNumber(input.registrationNumber);
  if (!reg) {
    return requireIdentifier
      ? { ok: false, error: "Въведете валиден регистрационен номер", field: "registrationNumber" }
      : { ok: true, countryCode, isBg, eik: null, registrationNumber: null };
  }
  // Формална проверка: поне 2 символа, само букви/цифри/разумни разделители.
  if (reg.length < 2 || !/^[A-Za-z0-9][A-Za-z0-9 .\-/]*$/.test(reg)) {
    return { ok: false, error: "Въведете валиден регистрационен номер", field: "registrationNumber" };
  }
  return { ok: true, countryCode, isBg, eik: null, registrationNumber: reg };
}
