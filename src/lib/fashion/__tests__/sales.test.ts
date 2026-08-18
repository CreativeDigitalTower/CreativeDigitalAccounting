import { describe, it, expect } from "vitest";
import { isValidPeriod, lineRevenue, lineCogs, salesTotals, reportGrossMarginPct, SALES_STATUSES } from "@/lib/fashion/sales";

describe("Fashion Sales — период и редове (§18)", () => {
  it("валидира периода ГГГГ-ММ", () => {
    expect(isValidPeriod("2026-08")).toBe(true);
    expect(isValidPeriod("2026-13")).toBe(false);
    expect(isValidPeriod("2026-8")).toBe(false);
    expect(isValidPeriod("август")).toBe(false);
  });
  it("приход на ред = к-во × цена − отстъпка (не под 0)", () => {
    expect(lineRevenue(10, 39, 0)).toBe(390);
    expect(lineRevenue(10, 39, 40)).toBe(350);
    expect(lineRevenue(1, 39, 100)).toBe(0);
  });
  it("COGS на ред = к-во × себестойност", () => {
    expect(lineCogs(10, 12.5)).toBe(125);
  });
  it("статусите са draft/finalized", () => {
    expect(SALES_STATUSES).toEqual(["draft", "finalized"]);
  });
});

describe("Fashion Sales — обобщения на отчета", () => {
  const lines = [
    { quantity: 10, price: 39, discount: 0, unitCost: 12.5 },
    { quantity: 5, price: 45, discount: 25, unitCost: 14 },
  ];
  it("приход/COGS/печалба/бройки", () => {
    const t = salesTotals(lines);
    // приход: 390 + (225-25=200) = 590; COGS: 125 + 70 = 195; печалба: 395; бройки 15
    expect(t.revenue).toBe(590);
    expect(t.cogs).toBe(195);
    expect(t.grossProfit).toBe(395);
    expect(t.units).toBe(15);
  });
  it("брутен марж % (без деление на 0)", () => {
    expect(reportGrossMarginPct(590, 395)).toBe(66.95);
    expect(reportGrossMarginPct(0, 0)).toBe(0);
  });
});
