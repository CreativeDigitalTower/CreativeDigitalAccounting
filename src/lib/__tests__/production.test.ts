import { describe, it, expect } from "vitest";
import { productionNumber, materialsCost, unitCost, PRODUCTION_STATUSES } from "@/lib/production";

describe("productionNumber", () => {
  it("форматира PR-YYYY-NNNN", () => {
    expect(productionNumber(1, 2026)).toBe("PR-2026-0001");
    expect(productionNumber(42, 2026)).toBe("PR-2026-0042");
    expect(productionNumber(12345, 2026)).toBe("PR-2026-12345");
  });
});

describe("materialsCost — себестойност на вложените суровини", () => {
  it("сумира количество × ед. себестойност", () => {
    expect(materialsCost([{ quantity: 2, unitCost: 3 }, { quantity: 5, unitCost: 1.5 }])).toBe(13.5);
  });
  it("липсваща себестойност се брои като 0", () => {
    expect(materialsCost([{ quantity: 10, unitCost: null }, { quantity: 2, unitCost: 4 }])).toBe(8);
  });
  it("празен списък → 0", () => {
    expect(materialsCost([])).toBe(0);
  });
});

describe("unitCost — себестойност за единица", () => {
  it("дели материалите на произведеното количество", () => {
    expect(unitCost(100, 40)).toBe(2.5);
  });
  it("нулево количество → 0 (без деление на нула)", () => {
    expect(unitCost(100, 0)).toBe(0);
  });
});

describe("статуси", () => {
  it("включва планирана/в процес/завършена/анулирана", () => {
    expect(PRODUCTION_STATUSES).toEqual(["planned", "in_progress", "completed", "cancelled"]);
  });
});
