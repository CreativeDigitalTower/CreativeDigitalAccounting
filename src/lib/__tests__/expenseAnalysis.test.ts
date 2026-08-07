import { describe, it, expect } from "vitest";
import { groupExpenses, monthlyTotals, totalExpenses } from "@/lib/expenseAnalysis";
import { missingPresets, EXPENSE_PRESETS } from "@/lib/expenseCategories";

const E = (amount: number, over: Record<string, unknown> = {}) => ({ amount, date: "2026-05-10", ...over });

describe("groupExpenses", () => {
  it("групира по категория и сортира низходящо", () => {
    const rows = groupExpenses([
      E(100, { categoryName: "Гориво" }), E(50, { categoryName: "Наем" }), E(30, { categoryName: "Гориво" }),
    ], "category");
    expect(rows[0]).toEqual({ name: "Гориво", total: 130, count: 2 });
    expect(rows[1]).toEqual({ name: "Наем", total: 50, count: 1 });
  });
  it("липсваща стойност се групира под тире", () => {
    const rows = groupExpenses([E(20, { supplierName: null })], "supplier");
    expect(rows[0].name).toBe("—");
  });
  it("групира по проект", () => {
    const rows = groupExpenses([E(200, { projectName: "Обект А" }), E(100, { projectName: "Обект А" })], "project");
    expect(rows[0]).toEqual({ name: "Обект А", total: 300, count: 2 });
  });
});

describe("monthlyTotals", () => {
  it("сумира по месец за годината", () => {
    const m = monthlyTotals([
      E(100, { date: "2026-01-05" }), E(50, { date: "2026-01-20" }), E(70, { date: "2026-03-01" }), E(999, { date: "2025-01-01" }),
    ], 2026);
    expect(m[0]).toBe(150); // януари
    expect(m[2]).toBe(70);  // март
    expect(m.reduce((a, b) => a + b, 0)).toBe(220); // 2025 се изключва
  });
});

describe("totalExpenses", () => {
  it("сумира", () => { expect(totalExpenses([E(10), E(2.5)])).toBe(12.5); });
});

describe("пресетни категории", () => {
  it("списъкът включва производствените категории", () => {
    for (const key of ["Материали", "Суровини", "Гориво", "Транспорт", "Амортизации"]) {
      expect(EXPENSE_PRESETS).toContain(key);
    }
  });
  it("missingPresets връща само липсващите (case-insensitive)", () => {
    const miss = missingPresets(["гориво", "Наем"]);
    expect(miss).not.toContain("Гориво");
    expect(miss).not.toContain("Наем");
    expect(miss).toContain("Суровини");
  });
});
