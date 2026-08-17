import { describe, it, expect } from "vitest";
import {
  DEFAULT_OPERATION_CATEGORIES, totalMinutes, minutesToHours, minutesByCategory, minutesByMachine,
} from "@/lib/fashion/operations";

describe("Fashion Operations — категории (§9)", () => {
  it("включва основните видове операции", () => {
    const codes = DEFAULT_OPERATION_CATEGORIES.map((c) => c.code);
    for (const c of ["straight", "overlock", "coverstitch", "flatlock", "bartack", "buttonhole", "ironing", "control", "packing"]) {
      expect(codes).toContain(c);
    }
    expect(DEFAULT_OPERATION_CATEGORIES.length).toBeGreaterThanOrEqual(16);
  });
});

describe("Fashion Operations — производствено време (§10)", () => {
  const ops = [
    { expectedMinutes: 2.5, categoryLabel: "Оверлог", machineLabel: "Overlock 1" },
    { expectedMinutes: 1.2, categoryLabel: "Права машина", machineLabel: "Straight 1" },
    { expectedMinutes: 0.8, categoryLabel: "Оверлог", machineLabel: "Overlock 1" },
    { expectedMinutes: 3.0, categoryLabel: "Гладене", machineLabel: null },
  ];
  it("общо стандартно време = Σ (decimal-safe)", () => {
    expect(totalMinutes(ops)).toBe(7.5);
    expect(totalMinutes([])).toBe(0);
  });
  it("минути в часове", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(7.5)).toBe(0.125);
  });
  it("време по категория (подредено низходящо)", () => {
    const byCat = minutesByCategory(ops);
    expect(byCat[0]).toEqual({ key: "Оверлог", minutes: 3.3, count: 2 });
    expect(byCat.find((x) => x.key === "Гладене")?.minutes).toBe(3.0);
  });
  it("време по машина; липсваща машина отива в друга група", () => {
    const byMachine = minutesByMachine(ops);
    expect(byMachine.find((x) => x.key === "Overlock 1")?.minutes).toBe(3.3);
    expect(byMachine.find((x) => x.key === "—")?.minutes).toBe(3.0);
  });
});
