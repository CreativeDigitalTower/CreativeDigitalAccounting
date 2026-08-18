import { describe, it, expect } from "vitest";
import {
  directLabor, overheadCost, manufacturingCost, commercialTotal, fullyLoadedCost, margins, isPackagingCategory,
} from "@/lib/fashion/costing";

describe("Fashion Costing — компоненти (§20)", () => {
  it("Direct Labor = минути/60 × ставка", () => {
    expect(directLabor(30, 8)).toBe(4);      // 0.5h × 8
    expect(directLabor(12, 10)).toBe(2);     // 0.2h × 10
    expect(directLabor(0, 10)).toBe(0);
  });
  it("Overhead: per_unit (фиксирано) и percent_labor", () => {
    expect(overheadCost("per_unit", 1.5, 4)).toBe(1.5);
    expect(overheadCost("percent_labor", 25, 4)).toBe(1); // 25% × 4
  });
  it("Manufacturing = материали + опаковка + труд + overhead", () => {
    expect(manufacturingCost({ directMaterials: 24, packaging: 0.5, labor: 4, overhead: 1.5 })).toBe(30);
  });
  it("опаковъчните категории се разпознават", () => {
    expect(isPackagingCategory("Плик")).toBe(true);
    expect(isPackagingCategory("Плат")).toBe(false);
  });
});

describe("Fashion Costing — fully loaded + марж (§21, §22)", () => {
  it("commercialTotal + fullyLoaded", () => {
    const c = { marketing: 2, paymentFees: 1.2, fulfillment: 1.5, returnsAllowance: 0.8, logistics: 0.5, other: 0 };
    expect(commercialTotal(c)).toBe(6);
    expect(fullyLoadedCost(30, c)).toBe(36);
  });
  it("Gross Profit / Margin / Markup", () => {
    const m = margins(39, 30); // продажна 39, себестойност 30
    expect(m.grossProfit).toBe(9);
    expect(m.grossMarginPct).toBe(23.08); // 9/39
    expect(m.markupPct).toBe(30);         // 9/30
  });
  it("нулева продажна/себестойност → 0% (без деление на 0)", () => {
    expect(margins(0, 30).grossMarginPct).toBe(0);
    expect(margins(39, 0).markupPct).toBe(0);
  });
});
