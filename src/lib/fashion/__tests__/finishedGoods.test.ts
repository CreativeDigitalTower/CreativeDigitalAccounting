import { describe, it, expect } from "vitest";
import {
  FG_MOVEMENT_TYPES, fgMovementSpec, fgAvailableAfter, canReduceFg, receivableRemaining, fgStockValue,
} from "@/lib/fashion/finishedGoods";

describe("Fashion Finished Goods — движения (§17)", () => {
  it("спецификация: PRODUCTION_OUTPUT влиза, SALE излиза", () => {
    expect(fgMovementSpec("PRODUCTION_OUTPUT")).toEqual({ dir: "in", counter: "produced" });
    expect(fgMovementSpec("SALE")).toEqual({ dir: "out", counter: "sold" });
    expect(fgMovementSpec("GIFT")).toEqual({ dir: "out", counter: "gifted" });
    expect(fgMovementSpec("ADJUSTMENT")).toEqual({ dir: null, counter: null });
    expect(FG_MOVEMENT_TYPES).toContain("RETURN");
  });
  it("наличност след движение", () => {
    expect(fgAvailableAfter(10, "in", 5)).toBe(15);
    expect(fgAvailableAfter(10, "out", 4)).toBe(6);
  });
  it("не позволява отрицателна наличност (освен allowNegative)", () => {
    expect(canReduceFg(3, 5, false)).toBe(false);
    expect(canReduceFg(3, 5, true)).toBe(true);
    expect(canReduceFg(5, 5, false)).toBe(true);
  });
});

describe("Fashion Finished Goods — прехвърляне и стойност", () => {
  it("оставащи за прехвърляне = готови − вече прехвърлени (не под 0)", () => {
    expect(receivableRemaining(55, 0)).toBe(55);
    expect(receivableRemaining(55, 40)).toBe(15);
    expect(receivableRemaining(55, 55)).toBe(0);
    expect(receivableRemaining(55, 60)).toBe(0);
  });
  it("стойност на наличността по себестойност + потенциален retail", () => {
    const v = fgStockValue([
      { available: 10, unitCost: 12.5, retailPrice: 39 },
      { available: 5, unitCost: 12.5, retailPrice: 39 },
    ]);
    expect(v.cost).toBe(187.5);   // 15 × 12.5
    expect(v.retail).toBe(585);   // 15 × 39
  });
  it("липсваща retail цена → 0 принос", () => {
    expect(fgStockValue([{ available: 4, unitCost: 10, retailPrice: null }]).retail).toBe(0);
  });
});
