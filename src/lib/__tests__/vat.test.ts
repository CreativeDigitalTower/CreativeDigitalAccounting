import { describe, it, expect } from "vitest";
import { normalizeVat, isValidVat, deriveVatRegistered } from "@/lib/validation/vat";

describe("normalizeVat", () => {
  it("главни букви, без интервали/тирета", () => {
    expect(normalizeVat(" bg 204 993 131 ")).toBe("BG204993131");
    expect(normalizeVat("bg-204993131")).toBe("BG204993131");
    expect(normalizeVat(null)).toBe("");
  });
});

describe("isValidVat", () => {
  it("валиден български ДДС номер (BG + валиден ЕИК)", () => {
    expect(isValidVat("BG204993131")).toBe(true);
    expect(isValidVat("bg 204993131")).toBe(true); // нормализира се
  });
  it("невалиден ЕИК след BG → невалиден", () => {
    expect(isValidVat("BG123456789")).toBe(false);
  });
  it("без държавен префикс → невалиден", () => {
    expect(isValidVat("204993131")).toBe(false);
  });
  it("празно/липсващо → невалиден", () => {
    expect(isValidVat("")).toBe(false);
    expect(isValidVat(null)).toBe(false);
    expect(isValidVat(undefined)).toBe(false);
  });
  it("друга ЕС държава с базов формат", () => {
    expect(isValidVat("DE123456789")).toBe(true);
    expect(isValidVat("RO1234567")).toBe(true);
  });
  it("не приема само BG без цифри", () => {
    expect(isValidVat("BG")).toBe(false);
  });
});

describe("deriveVatRegistered — приоритет на източника", () => {
  it("изрично записан булев статус печели", () => {
    expect(deriveVatRegistered({ vatRegistered: true, vatNumber: null })).toBe(true);
    expect(deriveVatRegistered({ vatRegistered: false, vatNumber: "BG204993131" })).toBe(false);
  });
  it("без изричен статус, но валиден ДДС номер → регистриран", () => {
    expect(deriveVatRegistered({ vatNumber: "BG204993131" })).toBe(true);
  });
  it("без ДДС номер → нерегистриран", () => {
    expect(deriveVatRegistered({ vatNumber: null })).toBe(false);
    expect(deriveVatRegistered({ vatNumber: "" })).toBe(false);
  });
});
