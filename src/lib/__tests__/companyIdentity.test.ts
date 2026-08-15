import { describe, it, expect } from "vitest";
import { validateCompanyIdentity, normalizeCountryCode, isBulgarianCompany } from "@/lib/validation/companyIdentity";
import { companyIdentifier } from "@/lib/company/identifier";
import { computeCheckDigit9 } from "@/lib/validation/eik";

// Валиден 9-цифрен BG ЕИК за тестове.
const validEik = (() => { const f = "10958151"; return f + computeCheckDigit9(f); })();

describe("normalizeCountryCode / isBulgarianCompany", () => {
  it("празно → BG (backward-compatible)", () => {
    expect(normalizeCountryCode(null)).toBe("BG");
    expect(isBulgarianCompany(undefined)).toBe(true);
  });
  it("нормализира до главни ISO2", () => {
    expect(normalizeCountryCode("mk")).toBe("MK");
    expect(isBulgarianCompany("MK")).toBe(false);
  });
});

describe("Test 1: BG фирма + валиден ЕИК → success", () => {
  it("приема валиден ЕИК", () => {
    const r = validateCompanyIdentity({ countryCode: "BG", eik: validEik });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.eik).toBe(validEik); expect(r.registrationNumber).toBe(null); }
  });
});

describe("Test 2: BG фирма + невалиден ЕИК → rejected", () => {
  it("отхвърля невалиден ЕИК", () => {
    const r = validateCompanyIdentity({ countryCode: "BG", eik: "123456789" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("eik");
  });
});

describe("Test 3: MK фирма + рег. номер → success без BG валидация", () => {
  it("приема буквено-цифров рег. номер без checksum", () => {
    const r = validateCompanyIdentity({ countryCode: "MK", registrationNumber: "MK-7412589" });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.registrationNumber).toBe("MK-7412589"); expect(r.eik).toBe(null); }
  });
  it("не прилага 9/13 цифри checksum за чуждестранна фирма", () => {
    // Стойност, която НЕ е валиден BG ЕИК, но е валиден рег. номер за MK.
    expect(validateCompanyIdentity({ countryCode: "MK", registrationNumber: "7412589" }).ok).toBe(true);
  });
});

describe("Test 4: MK без VAT → success (registrationNumber задължителен, VAT — не)", () => {
  it("VAT не е част от валидацията на идентичността", () => {
    const r = validateCompanyIdentity({ countryCode: "MK", registrationNumber: "1234567" });
    expect(r.ok).toBe(true);
  });
});

describe("Test 5: не се изисква фиктивен ЕИК за чуждестранна фирма", () => {
  it("MK фирма минава без каквато и да е стойност в eik", () => {
    const r = validateCompanyIdentity({ countryCode: "MK", eik: null, registrationNumber: "MK123" });
    expect(r.ok).toBe(true);
  });
  it("липсващ рег. номер връща международна грешка, не ЕИК грешка", () => {
    const r = validateCompanyIdentity({ countryCode: "MK", registrationNumber: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.field).toBe("registrationNumber"); expect(r.error).not.toContain("ЕИК"); }
  });
});

describe("документен идентификатор (BG ЕИК vs международен рег. номер)", () => {
  it("BG → показва ЕИК", () => {
    expect(companyIdentifier({ countryCode: "BG", eik: validEik })).toEqual({ kind: "eik", value: validEik });
  });
  it("MK → показва рег. номер, не фиктивни деветки", () => {
    expect(companyIdentifier({ countryCode: "MK", registrationNumber: "7412589" })).toEqual({ kind: "reg", value: "7412589" });
  });
  it("без идентификатор → null (документът не показва ред)", () => {
    expect(companyIdentifier({ countryCode: "MK" })).toBe(null);
  });
});
