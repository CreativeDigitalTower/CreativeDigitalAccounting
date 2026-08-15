import { describe, it, expect } from "vitest";
import { costBaseAmount, shipmentCostSummary, fxRateFromRegistry } from "@/lib/logistics/costCalc";
import { costIncludedByDefault } from "@/lib/logistics/config";

describe("costBaseAmount (валутна конверсия, decimal)", () => {
  it("същата валута (fxRate=1) → без промяна", () => {
    expect(costBaseAmount(120.5, 1)).toBe(120.5);
  });
  it("MKD → EUR (fxRate 0.01626 за 1230 MKD ≈ 20.00 EUR)", () => {
    expect(costBaseAmount(1230, 0.01626)).toBe(20);
  });
  it("липсващ/невалиден курс → третира се като 1", () => {
    expect(costBaseAmount(50, null)).toBe(50);
    expect(costBaseAmount(50, 0)).toBe(50);
  });
});

describe("fxRateFromRegistry (1 base = rate quote → множител quote→base)", () => {
  it("1 EUR = 61.5 MKD → множител ≈ 0.01626", () => {
    expect(fxRateFromRegistry(61.5)).toBeCloseTo(0.01626, 5);
  });
  it("невалиден → 1", () => {
    expect(fxRateFromRegistry(0)).toBe(1);
    expect(fxRateFromRegistry(null)).toBe(1);
  });
});

describe("costIncludedByDefault (раздел 49: ДДВ не е себестойност)", () => {
  it("ДДВ по подразбиране НЕ влиза", () => {
    expect(costIncludedByDefault("mk_vat")).toBe(false);
  });
  it("останалите влизат", () => {
    expect(costIncludedByDefault("transport")).toBe(true);
    expect(costIncludedByDefault("border_fee")).toBe(true);
    expect(costIncludedByDefault("customs_service")).toBe(true);
  });
});

describe("shipmentCostSummary", () => {
  it("себестойност = покупка + разходи (в себестойност); ДДВ е извън", () => {
    const r = shipmentCostSummary(1829.8, [
      { baseAmount: 200, includeInCost: true },   // транспорт
      { baseAmount: 50, includeInCost: true },    // гранична такса
      { baseAmount: 380, includeInCost: false },  // ДДВ (извън)
    ]);
    expect(r.purchase).toBe(1829.8);
    expect(r.costsIncluded).toBe(250);
    expect(r.costsExcluded).toBe(380);
    expect(r.totalCost).toBe(2079.8); // 1829.80 + 250
  });
  it("без разходи → себестойност = покупка", () => {
    const r = shipmentCostSummary(1000, []);
    expect(r.totalCost).toBe(1000);
  });
});
