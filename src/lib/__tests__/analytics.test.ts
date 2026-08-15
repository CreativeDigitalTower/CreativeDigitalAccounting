import { describe, it, expect } from "vitest";
import { pctChange, profitability, topN, comparePeriod, productAnalytics } from "@/lib/logistics/analytics";

describe("pctChange", () => {
  it("2025 720t → 2026 850t ≈ +18%", () => {
    expect(pctChange(720, 850)).toBe(18.06);
  });
  it("спад", () => {
    expect(pctChange(100, 69)).toBe(-31);
  });
  it("без база → null", () => {
    expect(pctChange(0, 50)).toBe(null);
  });
});

describe("profitability", () => {
  it("приходи − покупка − разходи = брутен резултат; марж %", () => {
    const r = profitability(1000, 200, 1500);
    expect(r.gross).toBe(300);
    expect(r.marginPct).toBe(20);
  });
  it("без приходи → марж null", () => {
    expect(profitability(100, 0, 0).marginPct).toBe(null);
  });
});

describe("topN", () => {
  it("сортира desc и реже", () => {
    const r = topN([{ v: 3 }, { v: 9 }, { v: 1 }, { v: 7 }], (x) => x.v, 2);
    expect(r.map((x) => x.v)).toEqual([9, 7]);
  });
});

describe("comparePeriod", () => {
  it("етикет + промяна", () => {
    const c = comparePeriod("revenue", 84000, 97500);
    expect(c.prev).toBe(84000);
    expect(c.cur).toBe(97500);
    expect(c.changePct).toBe(16.07);
  });
});

describe("productAnalytics (марж = ср. продажна − ср. покупна)", () => {
  it("изчислява средни цени и марж на единица", () => {
    const r = productAnalytics(
      [{ product: "Cement A", quantity: 10, revenue: 800 }, { product: "Cement A", quantity: 10, revenue: 820 }],
      [{ product: "Cement A", quantity: 20, value: 1400 }],
    );
    const a = r.find((x) => x.product === "Cement A")!;
    expect(a.soldQuantity).toBe(20);
    expect(a.avgSalePrice).toBe(81);      // 1620/20
    expect(a.avgPurchasePrice).toBe(70);  // 1400/20
    expect(a.marginPerUnit).toBe(11);
  });
  it("само продажби (без покупка) → марж null", () => {
    const r = productAnalytics([{ product: "X", quantity: 5, revenue: 500 }], []);
    expect(r[0].avgSalePrice).toBe(100);
    expect(r[0].marginPerUnit).toBe(null);
  });
});
