import { describe, it, expect } from "vitest";
import {
  parseLocalizedNumber,
  isValidNumberInput,
  toNumber,
  toCanonicalString,
  toEditableString,
} from "@/lib/number";

describe("parseLocalizedNumber — валидни входове", () => {
  const cases: [string, number][] = [
    ["1234,56", 1234.56],
    ["1234.56", 1234.56],
    ["1 234,56", 1234.56],
    ["1 234.56", 1234.56],
    ["1.234,56", 1234.56], // RO/BG формат
    ["1,234.56", 1234.56], // EN формат
    ["1234", 1234],
    ["1234,5", 1234.5],
    ["1234.5", 1234.5],
    ["0,25", 0.25],
    ["0.25", 0.25],
    ["100", 100],
    ["100,00", 100],
    ["100.00", 100],
    ["9999999,99", 9999999.99],
    ["9999999.99", 9999999.99],
    ["1 234 567,89", 1234567.89],
    ["1,234,567.89", 1234567.89],
    ["1.234.567,89", 1234567.89],
    ["-12,5", -12.5],
    ["+3,5", 3.5],
    [",5", 0.5],
    ["1'234.56", 1234.56], // апостроф като разделител на хиляди
  ];
  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      expect(parseLocalizedNumber(input)).toBeCloseTo(expected, 10);
    });
  }

  it("приема number директно", () => {
    expect(parseLocalizedNumber(42.5)).toBe(42.5);
    expect(parseLocalizedNumber(0)).toBe(0);
  });
});

describe("parseLocalizedNumber — невалидни входове → null", () => {
  const invalid = [
    "1,,2",
    "1..2",
    "1,2.3",
    "1.2,3",
    "..",
    ",,",
    "abc",
    "12abc",
    "1,2,3", // невалидно групиране
    "1.2345,6", // невалидна група преди хилядите
    "",
    "   ",
    "-",
    "€",
    "1e5", // без научна нотация
    null,
    undefined,
    {},
    NaN,
    Infinity,
  ];
  for (const input of invalid) {
    it(`${JSON.stringify(input)} → null`, () => {
      expect(parseLocalizedNumber(input as unknown)).toBeNull();
    });
  }
});

describe("isValidNumberInput", () => {
  it("валидни", () => {
    expect(isValidNumberInput("1234,56")).toBe(true);
    expect(isValidNumberInput("0.25")).toBe(true);
  });
  it("невалидни", () => {
    expect(isValidNumberInput("")).toBe(false);
    expect(isValidNumberInput("1,,2")).toBe(false);
    expect(isValidNumberInput("abc")).toBe(false);
  });
});

describe("toNumber (fallback)", () => {
  it("връща числото при валиден вход", () => {
    expect(toNumber("1 234,56")).toBeCloseTo(1234.56, 10);
  });
  it("връща fallback при невалиден вход", () => {
    expect(toNumber("", 0)).toBe(0);
    expect(toNumber("abc", 0)).toBe(0);
    expect(toNumber(null, 7)).toBe(7);
  });
});

describe("toCanonicalString", () => {
  it("нормализира до '.' десетичен", () => {
    expect(toCanonicalString("1 234,56")).toBe("1234.56");
    expect(toCanonicalString("1.234,50")).toBe("1234.5");
    expect(toCanonicalString("abc")).toBe("");
  });
});

describe("toEditableString", () => {
  it("bg → десетична запетая, без групиране", () => {
    expect(toEditableString(1234.56, "bg")).toBe("1234,56");
  });
  it("en → десетична точка", () => {
    expect(toEditableString(1234.56, "en")).toBe("1234.56");
  });
  it("null → празно", () => {
    expect(toEditableString(null, "bg")).toBe("");
  });
});
