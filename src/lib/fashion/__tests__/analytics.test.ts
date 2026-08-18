import { describe, it, expect } from "vitest";
import { sellThroughRate, defectRate, materialWastePct, costVariancePct, grossMarginPct, topN, bottomN } from "@/lib/fashion/analytics";

describe("Fashion Analytics — съотношения (§24)", () => {
  it("sell-through = продадени / произведени", () => {
    expect(sellThroughRate(30, 100)).toBe(30);
    expect(sellThroughRate(0, 0)).toBe(0); // без деление на 0
  });
  it("defect rate = дефектни / произведени", () => {
    expect(defectRate(5, 55)).toBe(9.09);
    expect(defectRate(3, 0)).toBe(0);
  });
  it("material waste % = отпадък / използван", () => {
    expect(materialWastePct(2.6, 81.2)).toBe(3.2);
  });
  it("cost variance % = (реален − стандартен) / стандартен", () => {
    expect(costVariancePct(81.2, 78.6)).toBe(3.31);
    expect(costVariancePct(78.6, 78.6)).toBe(0);
    expect(costVariancePct(5, 0)).toBe(0);
  });
  it("gross margin %", () => {
    expect(grossMarginPct(590, 395)).toBe(66.95);
    expect(grossMarginPct(0, 0)).toBe(0);
  });
});

describe("Fashion Analytics — класации", () => {
  const items = [{ key: "A", value: 10 }, { key: "B", value: 30 }, { key: "C", value: 5 }];
  it("topN низходящо", () => {
    expect(topN(items, 2)).toEqual([{ key: "B", value: 30 }, { key: "A", value: 10 }]);
  });
  it("bottomN възходящо (slow movers)", () => {
    expect(bottomN(items, 2)).toEqual([{ key: "C", value: 5 }, { key: "A", value: 10 }]);
  });
});
