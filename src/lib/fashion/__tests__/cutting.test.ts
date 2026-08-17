import { describe, it, expect } from "vitest";
import {
  CUTTING_STATUSES, REMNANT_STATUSES, cuttingTotalUnits, expectedFabric, fabricVariance,
} from "@/lib/fashion/cutting";
import { resolveQuantity } from "@/lib/fashion/bom";

describe("Fashion Cutting — количества и разход (§11, §12)", () => {
  const lines = [
    { size: "XS", quantity: 5 }, { size: "S", quantity: 15 }, { size: "M", quantity: 20 },
    { size: "L", quantity: 10 }, { size: "XL", quantity: 5 },
  ];
  it("общо скроени = Σ по размер (пример 55)", () => {
    expect(cuttingTotalUnits(lines)).toBe(55);
    expect(cuttingTotalUnits([])).toBe(0);
  });

  it("теоретичен разход = Σ (брой × BOM метри за размера)", () => {
    // BOM плат: base 1.42; overrides XS 1.32, S 1.37, M 1.43, L 1.51, XL 1.61.
    const ov = [
      { size: "XS", color: "", quantity: 1.32 }, { size: "S", color: "", quantity: 1.37 },
      { size: "M", color: "", quantity: 1.43 }, { size: "L", color: "", quantity: 1.51 },
      { size: "XL", color: "", quantity: 1.61 },
    ];
    const exp = expectedFabric(lines, (size) => resolveQuantity(1.42, ov, size, null));
    // 5*1.32 + 15*1.37 + 20*1.43 + 10*1.51 + 5*1.61 = 78.9
    expect(exp).toBe(78.9);
  });

  it("липсващ BOM за размер → базово количество", () => {
    const exp = expectedFabric([{ size: "M", quantity: 10 }], () => 1.42);
    expect(exp).toBe(14.2);
  });

  it("разлика теоретичен↔реален (+2.60 m, +3.31%)", () => {
    const v = fabricVariance(78.6, 81.2);
    expect(v.diff).toBe(2.6);
    expect(v.pct).toBe(3.31);
  });
  it("нулев теоретичен разход → 0% (без деление на 0)", () => {
    expect(fabricVariance(0, 5).pct).toBe(0);
  });
  it("статусите са дефинирани", () => {
    expect(CUTTING_STATUSES).toEqual(["draft", "confirmed", "cancelled"]);
    expect(REMNANT_STATUSES).toContain("available");
    expect(REMNANT_STATUSES).toContain("waste");
  });
});
