import { describe, it, expect } from "vitest";
import { resolvePeriodRange, monthKey, isPeriodKey, prismaDateFilter } from "@/lib/logistics/period";
import { summarizeTrips, bucketByMonth, bucketByYear } from "@/lib/logistics/tripStats";

const NOW = new Date(2026, 8, 15, 12, 0, 0); // 2026-09-15 local

describe("period (§39/§40)", () => {
  it("this_month → от 1-во число на текущия месец", () => {
    const r = resolvePeriodRange("this_month", { now: NOW });
    expect(r.from).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
    expect(r.to).toBeNull();
  });
  it("this_year → от 1 януари", () => {
    expect(resolvePeriodRange("this_year", { now: NOW }).from).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });
  it("all_time → без граници", () => {
    expect(resolvePeriodRange("all_time", { now: NOW })).toEqual({ from: null, to: null });
  });
  it("last_3_months → 3 месеца назад", () => {
    expect(resolvePeriodRange("last_3_months", { now: NOW }).from).toEqual(new Date(2026, 5, 15, 0, 0, 0, 0));
  });
  it("custom → парсва from/to граници", () => {
    const r = resolvePeriodRange("custom", { from: "2026-01-10", to: "2026-02-20" });
    expect(r.from?.getFullYear()).toBe(2026);
    expect(r.to?.getHours()).toBe(23);
  });
  it("monthKey → YYYY-MM локално", () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 31))).toBe("2026-12");
  });
  it("isPeriodKey / prismaDateFilter", () => {
    expect(isPeriodKey("this_month")).toBe(true);
    expect(isPeriodKey("nope")).toBe(false);
    expect(prismaDateFilter({ from: NOW, to: null })).toEqual({ gte: NOW });
    expect(prismaDateFilter({ from: null, to: null })).toEqual({});
  });
});

const rows = [
  { date: new Date(2026, 8, 3), quantity: 26.04 },   // 2026-09
  { date: new Date(2026, 8, 20), quantity: 26.04 },  // 2026-09
  { date: new Date(2026, 7, 10), quantity: 26.04 },  // 2026-08
  { date: "2025-05-01", quantity: 26.04 },           // 2025-05
  { date: null, quantity: 100 },                     // без дата → в total, не в bucket
];

describe("summarizeTrips (§2/§10/§41)", () => {
  it("общо курсове = брой редове (вкл. без дата); количество 3 decimals", () => {
    const s = summarizeTrips(rows, NOW);
    expect(s.trips).toBe(5);
    expect(s.quantity).toBe(204.16);
  });
  it("текущ месец брои само редове от текущия календарен месец", () => {
    const s = summarizeTrips(rows, NOW);
    expect(s.thisMonthTrips).toBe(2);
    expect(s.thisMonthQuantity).toBe(52.08);
  });
  it("първи/последен курс по дата", () => {
    const s = summarizeTrips(rows, NOW);
    expect(s.firstTrip).toBe(new Date("2025-05-01").toISOString());
    expect(new Date(s.lastTrip!).getMonth()).toBe(8);
  });
});

describe("bucketByMonth / bucketByYear (§11/§12/§40)", () => {
  it("последните 12 месеца, нулево-запълнени, най-новият първи", () => {
    const b = bucketByMonth(rows, 12, NOW);
    expect(b).toHaveLength(12);
    expect(b[0].month).toBe("2026-09");
    expect(b[0].trips).toBe(2);
    expect(b[1].month).toBe("2026-08");
    expect(b[1].trips).toBe(1);
    expect(b.find((x) => x.month === "2025-05")).toBeUndefined(); // извън 12м прозорец
  });
  it("годишна справка, най-новата първа", () => {
    const y = bucketByYear(rows);
    expect(y[0]).toEqual({ year: 2026, trips: 3, quantity: 78.12 });
    expect(y[1]).toEqual({ year: 2025, trips: 1, quantity: 26.04 });
  });
});
