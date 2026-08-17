import { describe, it, expect } from "vitest";
import {
  DEFECT_DISPOSITIONS, SAMPLE_TYPES, DEFAULT_DEFECT_CATEGORIES, computeOrderCounts,
} from "@/lib/fashion/qc";

describe("Fashion QC — решения и типове (§15, §16)", () => {
  it("решенията покриват целия набор", () => {
    for (const d of ["repair", "repaired", "scrap", "second_quality", "sample", "marketing", "photoshoot", "gift", "internal"]) {
      expect(DEFECT_DISPOSITIONS).toContain(d);
    }
  });
  it("видовете мостри включват First/Fit/Size Set/…", () => {
    expect(SAMPLE_TYPES).toContain("first_sample");
    expect(SAMPLE_TYPES).toContain("fit_sample");
    expect(SAMPLE_TYPES).toContain("size_set");
  });
  it("типовете дефекти по подразбиране включват основните", () => {
    const names = DEFAULT_DEFECT_CATEGORIES.map((c) => c.name);
    expect(names).toContain("Крив шев");
    expect(names).toContain("Дефект на плат");
    expect(DEFAULT_DEFECT_CATEGORIES.length).toBeGreaterThanOrEqual(12);
  });
});

describe("Fashion QC — преизчисляване на броевете (recompute-from-source)", () => {
  it("добри + дефектни (repair не влиза в готовите)", () => {
    const c = computeOrderCounts(40, [
      { quantity: 3, disposition: "repair" },
      { quantity: 2, disposition: "scrap" },
    ]);
    expect(c).toEqual({ good: 40, defective: 5, repair: 3, ready: 40 });
  });
  it("поправена бройка се връща към готовите", () => {
    const c = computeOrderCounts(40, [
      { quantity: 3, disposition: "repaired" }, // поправена → +ready
      { quantity: 1, disposition: "scrap" },
    ]);
    expect(c).toEqual({ good: 40, defective: 4, repair: 0, ready: 43 });
  });
  it("scrap не влиза в продаваемата наличност", () => {
    const c = computeOrderCounts(10, [{ quantity: 5, disposition: "scrap" }]);
    expect(c.ready).toBe(10); // само добрите
    expect(c.defective).toBe(5);
  });
  it("без дефекти → всички добри са готови", () => {
    expect(computeOrderCounts(55, [])).toEqual({ good: 55, defective: 0, repair: 0, ready: 55 });
  });
});
