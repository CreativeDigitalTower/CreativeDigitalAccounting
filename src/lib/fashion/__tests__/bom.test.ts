import { describe, it, expect } from "vitest";
import { resolveQuantity, bomBreakdown, bomMaterialCost, type BomLineInput } from "@/lib/fashion/bom";

describe("Fashion BOM — резолвиране на количество (§8)", () => {
  const ov = [
    { size: "S", color: "", quantity: 1.37 },
    { size: "M", color: "", quantity: 1.43 },
    { size: "L", color: "", quantity: 1.51 },
    { size: "M", color: "Black", quantity: 1.45 }, // exact override
    { size: "", color: "Red", quantity: 1.40 },    // color-only
  ];
  it("базово количество, ако няма override", () => {
    expect(resolveQuantity(1.42, ov, "XL", "White")).toBe(1.42);
  });
  it("override по размер", () => {
    expect(resolveQuantity(1.42, ov, "S", "White")).toBe(1.37);
    expect(resolveQuantity(1.42, ov, "L", "White")).toBe(1.51);
  });
  it("точен override (размер + цвят) има приоритет пред само-размер", () => {
    expect(resolveQuantity(1.42, ov, "M", "Black")).toBe(1.45); // не 1.43
  });
  it("override само по цвят", () => {
    expect(resolveQuantity(1.42, ov, "XL", "Red")).toBe(1.40);
  });
  it("третира null и \"\" еднакво (wildcard)", () => {
    expect(resolveQuantity(2, [{ size: null, color: "Blue", quantity: 3 }], "S", "Blue")).toBe(3);
  });
});

describe("Fashion BOM — материална себестойност на бройка (§7)", () => {
  // EX Sculpt Dress (примерни материали + среднопретеглени цени).
  const lines: BomLineInput[] = [
    { materialId: "fabric", baseQuantity: 1.42, unit: "m", unitCost: 15.0667, overrides: [{ size: "S", color: "", quantity: 1.37 }] },
    { materialId: "lining", baseQuantity: 0.38, unit: "m", unitCost: 4.5, overrides: [] },
    { materialId: "elastic", baseQuantity: 0.72, unit: "m", unitCost: 0.6, overrides: [] },
    { materialId: "thread_black", baseQuantity: 165, unit: "m", unitCost: 0.002, overrides: [] },
    { materialId: "brand_label", baseQuantity: 1, unit: "pcs", unitCost: 0.12, overrides: [] },
  ];
  it("базова себестойност = Σ(количество × ср. цена)", () => {
    // 1.42*15.0667 + 0.38*4.5 + 0.72*0.6 + 165*0.002 + 1*0.12
    const cost = bomMaterialCost(lines);
    expect(cost).toBe(23.9867);
  });
  it("размер S ползва override количеството за плата", () => {
    const s = bomBreakdown(lines, "S", null).find((l) => l.materialId === "fabric");
    expect(s?.resolvedQuantity).toBe(1.37);
    // общата себестойност за S е по-ниска (по-малко плат)
    expect(bomMaterialCost(lines, "S", null)).toBeLessThan(bomMaterialCost(lines));
  });
  it("празен BOM → 0", () => {
    expect(bomMaterialCost([])).toBe(0);
  });
});
