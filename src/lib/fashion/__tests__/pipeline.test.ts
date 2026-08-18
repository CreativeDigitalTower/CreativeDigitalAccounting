import { describe, it, expect } from "vitest";
import { weightedAverage, applyMovement } from "@/lib/fashion/inventory";
import { resolveQuantity, bomMaterialCost, type BomLineInput } from "@/lib/fashion/bom";
import { expectedFabric, fabricVariance, cuttingTotalUnits } from "@/lib/fashion/cutting";
import { computeOrderCounts } from "@/lib/fashion/qc";
import { fgAvailableAfter } from "@/lib/fashion/finishedGoods";
import { salesTotals } from "@/lib/fashion/sales";
import { directLabor, overheadCost, manufacturingCost, margins } from "@/lib/fashion/costing";
import { sellThroughRate, defectRate } from "@/lib/fashion/analytics";

// End-to-end regression на целия workflow (§41): Purchase → Raw Material Inventory →
// Style → BOM → Cutting → Production → QC → Finished Goods → Sale → Cost / Margin / Analytics.
describe("Fashion — end-to-end pipeline (§41 workflow)", () => {
  it("числата текат консистентно през всички фази", () => {
    // 1) Доставки на плат → среднопретеглена цена + наличност.
    let fabricAvg = weightedAverage(0, 0, 100, 14.80);
    expect(fabricAvg).toBe(14.8);
    fabricAvg = weightedAverage(100, 14.8, 80, 15.40);
    expect(fabricAvg).toBe(15.0667);
    let fabricStock = 180; // 100 + 80

    // 2) BOM: плат по размер (base 1.42, overrides по размер).
    const ov = [
      { size: "XS", color: "", quantity: 1.32 }, { size: "S", color: "", quantity: 1.37 },
      { size: "M", color: "", quantity: 1.43 }, { size: "L", color: "", quantity: 1.51 }, { size: "XL", color: "", quantity: 1.61 },
    ];
    const bom: BomLineInput[] = [{ materialId: "fabric", baseQuantity: 1.42, unit: "m", unitCost: fabricAvg, overrides: ov }];
    const materialCostM = bomMaterialCost(bom, "M", null);
    expect(materialCostM).toBe(21.5454); // 1.43 × 15.0667

    // 3) Кроене: 55 бройки; теоретичен разход от BOM.
    const cutLines = [{ size: "XS", quantity: 5 }, { size: "S", quantity: 15 }, { size: "M", quantity: 20 }, { size: "L", quantity: 10 }, { size: "XL", quantity: 5 }];
    expect(cuttingTotalUnits(cutLines)).toBe(55);
    const expected = expectedFabric(cutLines, (s) => resolveQuantity(1.42, ov, s, null));
    expect(expected).toBe(78.9);
    const actual = 81.2;
    const v = fabricVariance(expected, actual);
    expect(v.diff).toBe(2.3); // 81.2 − 78.9
    // Приспадане на реалния разход от склада.
    fabricStock = applyMovement(fabricStock, "out", actual);
    expect(fabricStock).toBe(98.8);

    // 4) Производство: 55 скроени. 5) QC: 50 годни + дефекти (3 за поправка, 2 брак).
    let counts = computeOrderCounts(50, [{ quantity: 3, disposition: "repair" }, { quantity: 2, disposition: "scrap" }]);
    expect(counts).toEqual({ good: 50, defective: 5, repair: 3, ready: 50 });
    // Поправят се 3 → влизат в готовите.
    counts = computeOrderCounts(50, [{ quantity: 3, disposition: "repaired" }, { quantity: 2, disposition: "scrap" }]);
    expect(counts.ready).toBe(53);

    // 6) Готова продукция: приемат се 53 готови бройки.
    let fgAvailable = 0;
    fgAvailable = fgAvailableAfter(fgAvailable, "in", counts.ready);
    expect(fgAvailable).toBe(53);

    // 7) Себестойност: материали (M) + труд + overhead.
    const labor = directLabor(24, 8); // 24 мин × 8 €/ч
    expect(labor).toBe(3.2);
    const overhead = overheadCost("percent_labor", 25, labor);
    expect(overhead).toBe(0.8);
    const mfg = manufacturingCost({ directMaterials: materialCostM, packaging: 0.2, labor, overhead });
    expect(mfg).toBe(25.75); // 21.5453 + 0.2 + 3.2 + 0.8

    // 8) Продажба: 10 бр. @39; COGS по себестойност.
    const totals = salesTotals([{ quantity: 10, price: 39, discount: 0, unitCost: mfg }]);
    expect(totals.revenue).toBe(390);
    expect(totals.cogs).toBe(257.5);
    expect(totals.grossProfit).toBe(132.5);
    fgAvailable = fgAvailableAfter(fgAvailable, "out", 10);
    expect(fgAvailable).toBe(43);

    // Марж на продукта + аналитики.
    const m = margins(39, mfg);
    expect(m.grossProfit).toBe(13.25);
    expect(sellThroughRate(10, 53)).toBe(18.87);
    expect(defectRate(5, 55)).toBe(9.09);
  });
});
