import { describe, it, expect } from "vitest";
import { summarizeProduction, groupOrders, groupConsumedMaterials, activeOrders, type OrderForReport } from "@/lib/productionReports";

const O = (over: Partial<OrderForReport> = {}): OrderForReport => ({
  outputName: "Хляб", quantity: 10, unit: "бр", materialsCost: 20, unitCost: 2, operatorName: "Иван", status: "completed",
  consumptions: [{ itemName: "Брашно", quantity: 5, unit: "кг", unitCost: 3 }], ...over,
});

describe("summarizeProduction", () => {
  it("обобщава брой/количество/стойност/материали/средна себестойност", () => {
    const s = summarizeProduction([O({ quantity: 10, unitCost: 2, materialsCost: 20 }), O({ quantity: 5, unitCost: 4, materialsCost: 20 })]);
    expect(s.count).toBe(2);
    expect(s.producedQty).toBe(15);
    expect(s.producedValue).toBe(40); // 10*2 + 5*4
    expect(s.materialsCost).toBe(40);
    expect(s.avgUnitCost).toBeCloseTo(40 / 15, 2);
  });
  it("изключва анулираните производства", () => {
    const s = summarizeProduction([O(), O({ status: "cancelled", quantity: 100 })]);
    expect(s.count).toBe(1);
    expect(s.producedQty).toBe(10);
  });
});

describe("groupOrders", () => {
  it("групира по продукт", () => {
    const rows = groupOrders([O({ outputName: "Хляб", quantity: 10, unitCost: 2 }), O({ outputName: "Хляб", quantity: 5, unitCost: 2 }), O({ outputName: "Кекс", quantity: 3, unitCost: 5 })], "product");
    expect(rows.find((r) => r.name === "Хляб")).toMatchObject({ count: 2, qty: 15, value: 30 });
    expect(rows.find((r) => r.name === "Кекс")).toMatchObject({ count: 1, qty: 3, value: 15 });
  });
  it("групира по оператор и партида", () => {
    const rows = groupOrders([O({ operatorName: "Иван" }), O({ operatorName: "Петър" })], "operator");
    expect(rows.map((r) => r.name).sort()).toEqual(["Иван", "Петър"]);
    const b = groupOrders([O({ outputBatch: "L1" }), O({ outputBatch: "L1" })], "batch");
    expect(b[0]).toMatchObject({ name: "L1", count: 2 });
  });
  it("сортира низходящо по стойност", () => {
    const rows = groupOrders([O({ outputName: "A", quantity: 1, unitCost: 1 }), O({ outputName: "B", quantity: 10, unitCost: 10 })], "product");
    expect(rows[0].name).toBe("B");
  });
});

describe("groupConsumedMaterials", () => {
  it("сумира вложените суровини по всички поръчки", () => {
    const rows = groupConsumedMaterials([
      O({ consumptions: [{ itemName: "Брашно", quantity: 5, unitCost: 3 }, { itemName: "Захар", quantity: 2, unitCost: 1 }] }),
      O({ consumptions: [{ itemName: "Брашно", quantity: 5, unitCost: 3 }] }),
    ]);
    expect(rows.find((r) => r.name === "Брашно")).toEqual({ name: "Брашно", qty: 10, cost: 30 });
    expect(rows.find((r) => r.name === "Захар")).toEqual({ name: "Захар", qty: 2, cost: 2 });
    expect(rows[0].name).toBe("Брашно"); // сортирано по стойност
  });
});

describe("activeOrders", () => {
  it("филтрира анулираните", () => {
    expect(activeOrders([O(), O({ status: "cancelled" })]).length).toBe(1);
  });
});
