import { describe, it, expect } from "vitest";
import { fmtQuantity, fmtQuantityUnit, parseQuantity } from "@/lib/i18n/format";

// NBSP-агностична проверка (Intl може да ползва тесен NBSP за групиране/единици).
const norm = (s: string) => s.replace(/ | /g, " ");

describe("fmtQuantity — винаги 3 decimals, locale-aware", () => {
  it("BG locale uses comma", () => {
    expect(fmtQuantity(28, "bg")).toBe("28,000");
    expect(fmtQuantity(28.5, "bg")).toBe("28,500");
    expect(fmtQuantity(26.25, "bg")).toBe("26,250");
    expect(fmtQuantity(23.8, "bg")).toBe("23,800");
    expect(fmtQuantity(0.125, "bg")).toBe("0,125");
  });
  it("EN locale uses dot", () => {
    expect(fmtQuantity(28, "en")).toBe("28.000");
    expect(fmtQuantity(28.5, "en")).toBe("28.500");
    expect(fmtQuantity(26.25, "en")).toBe("26.250");
  });
  it("null/undefined → 0,000", () => {
    expect(fmtQuantity(null, "bg")).toBe("0,000");
    expect(fmtQuantity(undefined, "bg")).toBe("0,000");
  });
  it("does NOT round to 2 decimals (keeps 3rd)", () => {
    expect(fmtQuantity(26.255, "en")).toBe("26.255");
  });
  it("tonnage with unit", () => {
    expect(norm(fmtQuantityUnit(26.5, "t", "bg"))).toBe("26,500 t");
    expect(norm(fmtQuantityUnit(23.8, "t", "en"))).toBe("23.800 t");
  });
});

describe("parseQuantity — точка ИЛИ запетая", () => {
  it("plain integer", () => { expect(parseQuantity("28")).toBe(28); });
  it("dot decimal", () => { expect(parseQuantity("28.500")).toBe(28.5); });
  it("comma decimal", () => { expect(parseQuantity("28,5")).toBe(28.5); });
  it("comma decimal with trailing zeros", () => { expect(parseQuantity("28,250")).toBe(28.25); });
  it("comma as thousands when dot present", () => { expect(parseQuantity("1,234.5")).toBe(1234.5); });
  it("number passthrough", () => { expect(parseQuantity(26.25)).toBe(26.25); });
  it("empty / null → null", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity(null)).toBeNull();
    expect(parseQuantity("   ")).toBeNull();
  });
  it("invalid → null", () => {
    expect(parseQuantity("abc")).toBeNull();
    expect(parseQuantity("12x3")).toBeNull();
    expect(parseQuantity("1.2.3")).toBeNull();
  });
  it("roundtrip keeps 3-decimal precision", () => {
    expect(fmtQuantity(parseQuantity("0,125")!, "bg")).toBe("0,125");
    expect(fmtQuantity(parseQuantity("23.8")!, "bg")).toBe("23,800");
  });
});
