import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { validateTaxIdentifier, isBgCountryLike, validateCompanyIdentity } from "@/lib/validation/companyIdentity";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("validateTaxIdentifier — country-aware (§3/§4)", () => {
  it("1) BG + валиден ЕИК → приема (checksum)", () => {
    const r = validateTaxIdentifier({ country: "BG", eik: "131071587" });
    expect(r.ok).toBe(true);
  });
  it("2) BG + невалиден ЕИК → отказва (запазено поведение)", () => {
    const r = validateTaxIdentifier({ country: "BG", eik: "123456789" });
    expect(r.ok).toBe(false);
  });
  it("3) MK + non-BG рег. номер → приема БЕЗ БГ checksum", () => {
    const r = validateTaxIdentifier({ country: "MK", eik: "7152684" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("7152684");
  });
  it("3b) MK registration с име на държава (Македония) → приема", () => {
    expect(validateTaxIdentifier({ country: "Северна Македония", eik: "SK1234567" }).ok).toBe(true);
  });
  it("4/5) EU и извън-EU чужди номера → приемат се", () => {
    expect(validateTaxIdentifier({ country: "DE", eik: "HRB 12345" }).ok).toBe(true);
    expect(validateTaxIdentifier({ country: "US", eik: "12-3456789" }).ok).toBe(true);
  });
  it("6) букви в чужд номер → приема се", () => {
    expect(validateTaxIdentifier({ country: "IT", eik: "IT12345ABC" }).ok).toBe(true);
  });
  it("7) leading zeros се запазват (без Number)", () => {
    const r = validateTaxIdentifier({ country: "MK", eik: "0012345" });
    expect(r.ok && r.normalized).toBe("0012345");
  });
  it("празно → ok (идентификаторът не е задължителен за клиент/доставчик)", () => {
    expect(validateTaxIdentifier({ country: "MK", eik: "" }).ok).toBe(true);
    expect(validateTaxIdentifier({ country: "MK" }, { required: true }).ok).toBe(false);
  });
  it("BG checksum НЕ се прилага върху чужд номер (ядрото на SEM бъга, §19)", () => {
    // Същият низ като невалиден БГ ЕИК, но за MK фирма → приема се.
    expect(validateTaxIdentifier({ country: "BG", eik: "999999999" }).ok).toBe(false);
    expect(validateTaxIdentifier({ country: "MK", eik: "999999999" }).ok).toBe(true);
  });
});

describe("isBgCountryLike (§3)", () => {
  it("празно/BG/България → BG; MK/DE → не", () => {
    expect(isBgCountryLike("")).toBe(true);
    expect(isBgCountryLike("BG")).toBe(true);
    expect(isBgCountryLike("България")).toBe(true);
    expect(isBgCountryLike("Bulgaria")).toBe(true);
    expect(isBgCountryLike("MK")).toBe(false);
    expect(isBgCountryLike("DE")).toBe(false);
  });
});

describe("validateCompanyIdentity (Company/firm-clients) остава country-aware", () => {
  it("MK фирма с рег. номер → ok, без БГ checksum", () => {
    const r = validateCompanyIdentity({ countryCode: "MK", registrationNumber: "7152684" });
    expect(r.ok).toBe(true);
  });
  it("BG фирма с невалиден ЕИК → грешка", () => {
    const r = validateCompanyIdentity({ countryCode: "BG", eik: "123456789" });
    expect(r.ok).toBe(false);
  });
});

describe("source: BG-only validateEik премахнат от invoice/clients/suppliers пътищата (§17)", () => {
  it("issuer gate е country-aware (registrationNumber приема, §7)", () => {
    const s = read("src/app/(app)/dashboard/documents/new/page.tsx");
    expect(s).toContain("c?.eik || c?.registrationNumber");
    expect(s).not.toContain("c?.name && c?.eik && c?.address");
  });
  it("clients/suppliers API ползват validateTaxIdentifier, не суровия validateEik", () => {
    for (const p of ["src/app/api/clients/route.ts", "src/app/api/clients/[id]/route.ts", "src/app/api/suppliers/route.ts", "src/app/api/suppliers/[id]/route.ts"]) {
      expect(read(p)).toContain("validateTaxIdentifier");
      expect(read(p)).not.toContain('from "@/lib/validation/eik"');
    }
  });
  it("firm/clients (managed company) е country-aware", () => {
    expect(read("src/app/api/firm/clients/route.ts")).toContain("validateCompanyIdentity");
  });
});

describe("schema: Supplier.country additive (§11/§22)", () => {
  it("Supplier има nullable country", () => {
    expect(read("prisma/schema.prisma")).toMatch(/model Supplier[\s\S]*?country\s+String\?/);
  });
});
