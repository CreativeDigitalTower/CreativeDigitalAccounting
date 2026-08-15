/**
 * Идентификатор на фирма за документи: BG → ЕИК, международна → регистрационен номер.
 * Никога не връща фиктивни стойности; при липса → null (документът не показва ред).
 */
export type CompanyIdentity = { countryCode?: string | null; eik?: string | null; registrationNumber?: string | null };
export type IdentifierField = { kind: "eik" | "reg"; value: string };

export function companyIdentifier(c: CompanyIdentity): IdentifierField | null {
  const isBg = !c.countryCode || c.countryCode.toUpperCase() === "BG";
  if (isBg && c.eik && c.eik.trim()) return { kind: "eik", value: c.eik.trim() };
  if (!isBg && c.registrationNumber && c.registrationNumber.trim()) return { kind: "reg", value: c.registrationNumber.trim() };
  // Резерв: ако BG липсва, но има рег. номер (или обратно) — покажи каквото има.
  if (c.eik && c.eik.trim()) return { kind: "eik", value: c.eik.trim() };
  if (c.registrationNumber && c.registrationNumber.trim()) return { kind: "reg", value: c.registrationNumber.trim() };
  return null;
}
