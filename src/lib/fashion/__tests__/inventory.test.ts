import { describe, it, expect } from "vitest";
import {
  weightedAverage, allocateLandedCosts, movementDirection, canConsume, applyMovement, MOVEMENT_TYPES,
} from "@/lib/fashion/inventory";
import { DEFAULT_MATERIAL_CATEGORIES } from "@/lib/fashion/inventory";

describe("Fashion Inventory — среднопретеглена цена (§4)", () => {
  it("100m×14.80 + 80m×15.40 → 15.0667 (decimal-safe)", () => {
    const avg = weightedAverage(100, 14.8, 80, 15.4);
    expect(avg).toBe(15.0667);
  });
  it("първа доставка (без предишна наличност) → цената на доставката", () => {
    expect(weightedAverage(0, 0, 50, 12.5)).toBe(12.5);
  });
  it("нулево входящо количество не променя средната цена", () => {
    expect(weightedAverage(100, 14.8, 0, 99)).toBe(14.8);
  });
});

describe("Fashion Inventory — landed cost разпределение (§4)", () => {
  it("транспорт се разпределя пропорционално по стойност на реда", () => {
    // Ред1: 100×10 = 1000; Ред2: 100×20 = 2000; общо 3000; extra 300 → 100/200 по редовете.
    const res = allocateLandedCosts([
      { materialId: "a", quantity: 100, unit: "m", unitPrice: 10 },
      { materialId: "b", quantity: 100, unit: "m", unitPrice: 20 },
    ], 300);
    expect(res[0].allocatedExtra).toBe(100);
    expect(res[1].allocatedExtra).toBe(200);
    expect(res[0].landedUnitCost).toBe(11);   // (1000+100)/100
    expect(res[1].landedUnitCost).toBe(22);   // (2000+200)/100
  });
  it("без допълнителни разходи → landed = unit price", () => {
    const res = allocateLandedCosts([{ materialId: "a", quantity: 40, unit: "m", unitPrice: 15 }], 0);
    expect(res[0].allocatedExtra).toBe(0);
    expect(res[0].landedUnitCost).toBe(15);
  });
});

describe("Fashion Inventory — движения и наличност (§29, §30)", () => {
  it("посоката се извежда от типа; контекстуалните са null", () => {
    expect(movementDirection("PURCHASE")).toBe("in");
    expect(movementDirection("CUTTING_CONSUMPTION")).toBe("out");
    expect(movementDirection("STOCK_ADJUSTMENT")).toBe(null);
    expect(MOVEMENT_TYPES).toContain("SALE");
    expect(MOVEMENT_TYPES.length).toBe(14);
  });
  it("applyMovement добавя/изважда decimal-safe", () => {
    expect(applyMovement(180, "out", 55)).toBe(125);
    expect(applyMovement(0.1, "in", 0.2)).toBe(0.3);
  });
  it("не допуска отрицателна наличност (освен allowNegative)", () => {
    expect(canConsume(10, 15, false)).toBe(false);
    expect(canConsume(10, 15, true)).toBe(true);
    expect(canConsume(20, 15, false)).toBe(true);
  });
});

describe("Fashion — категории по подразбиране (§3)", () => {
  it("включва основните категории", () => {
    expect(DEFAULT_MATERIAL_CATEGORIES).toContain("Плат");
    expect(DEFAULT_MATERIAL_CATEGORIES).toContain("Конец");
    expect(DEFAULT_MATERIAL_CATEGORIES).toContain("Цип");
    expect(DEFAULT_MATERIAL_CATEGORIES.length).toBeGreaterThanOrEqual(20);
  });
});
