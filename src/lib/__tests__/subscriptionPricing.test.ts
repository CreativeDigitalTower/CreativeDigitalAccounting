import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_PLANS, FREE_PLAN_LIMIT, BILLING_PERIODS, isPromoActive, planPrice,
  periodTotalCents, periodTotalEuros, periodMonthlyEquivalentEuros,
} from "@/lib/constants";

describe("Редовни месечни цени (§2)", () => {
  it("са точно новите официални цени, без промоция", () => {
    expect(planPrice("free")).toBe(0);
    expect(planPrice("start")).toBe(4.9);
    expect(planPrice("business")).toBe(24.9);
    expect(planPrice("pro")).toBe(79);
  });
  it("price == regularPrice (няма зачеркната стара цена) и промоцията е изключена", () => {
    for (const id of ["free", "start", "business", "pro"] as const) {
      expect(SUBSCRIPTION_PLANS[id].price).toBe(SUBSCRIPTION_PLANS[id].regularPrice);
    }
    expect(isPromoActive()).toBe(false);
  });
  it("месечните центове съответстват на цените", () => {
    expect(SUBSCRIPTION_PLANS.start.monthlyCents).toBe(490);
    expect(SUBSCRIPTION_PLANS.business.monthlyCents).toBe(2490);
    expect(SUBSCRIPTION_PLANS.pro.monthlyCents).toBe(7900);
  });
});

describe("Месечни лимити за документи (§4)", () => {
  it("са новите лимити", () => {
    expect(SUBSCRIPTION_PLANS.free.docsPerMonth).toBe(10);
    expect(SUBSCRIPTION_PLANS.start.docsPerMonth).toBe(500);
    expect(SUBSCRIPTION_PLANS.business.docsPerMonth).toBe(2000);
    expect(SUBSCRIPTION_PLANS.pro.docsPerMonth).toBe(Infinity);
  });
  it("fallback лимитът (Free) е 10", () => {
    expect(FREE_PLAN_LIMIT).toBe(10);
  });
});

describe("Отстъпки за предплащане (§3)", () => {
  it("са 0% / 5% / 10%", () => {
    expect(BILLING_PERIODS.map((p) => p.discount)).toEqual([0, 0.05, 0.1]);
    expect(BILLING_PERIODS.map((p) => p.months)).toEqual([1, 6, 12]);
  });
});

// §3.1–§3.3 / §8.1 — всички общи суми, целочислено в центове (без float грешки).
describe("Общи суми по период — авторитетни стойности (§8.1)", () => {
  const expectedCents: Record<string, [number, number, number]> = {
    //            monthly, 6м,     12м
    free:     [0, 0, 0],
    start:    [490, 2793, 5292],
    business: [2490, 14193, 26892],
    pro:      [7900, 45030, 85320],
  };
  for (const plan of ["free", "start", "business", "pro"] as const) {
    const [m, h, y] = expectedCents[plan];
    it(`${plan}: месечно=${m}, 6м=${h}, 12м=${y} цента`, () => {
      expect(periodTotalCents(plan, "monthly")).toBe(m);
      expect(periodTotalCents(plan, "semiannual")).toBe(h);
      expect(periodTotalCents(plan, "annual")).toBe(y);
    });
  }
  it("евро стойностите съвпадат с заданието", () => {
    expect(periodTotalEuros("start", "semiannual")).toBe(27.93);
    expect(periodTotalEuros("start", "annual")).toBe(52.92);
    expect(periodTotalEuros("business", "semiannual")).toBe(141.93);
    expect(periodTotalEuros("business", "annual")).toBe(268.92);
    expect(periodTotalEuros("pro", "semiannual")).toBe(450.30);
    expect(periodTotalEuros("pro", "annual")).toBe(853.20);
  });
  it("месечен еквивалент (визуализация) е коректно закръглен", () => {
    expect(periodMonthlyEquivalentEuros("start", "annual")).toBeCloseTo(4.41, 2);
    expect(periodMonthlyEquivalentEuros("business", "annual")).toBeCloseTo(22.41, 2);
    expect(periodMonthlyEquivalentEuros("pro", "annual")).toBeCloseTo(71.10, 2);
  });
  it("общата сума е по-голяма от месечния еквивалент × месеци само по закръгляне, не по логика", () => {
    // 6м start: 27.93 = 4.655 × 6 точно
    expect(periodTotalEuros("start", "semiannual")).toBe(4.655 * 6);
  });
});

describe("Централен източник — няма разминаване UI ↔ backend (§8.2/§17)", () => {
  it("marketing Pricing извежда цените от SUBSCRIPTION_PLANS, без паралелна конфигурация", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("src/components/marketing/Pricing.tsx", "utf-8");
    // няма твърдо зададени стари/нови цени в масива
    expect(src).not.toMatch(/price:\s*(9|15|29|39|59)\b/);
    expect(src).toContain("SUBSCRIPTION_PLANS");
    expect(src).toContain("periodTotalEuros");
  });
  it("backend subscription/request изчислява сумата сам (не вярва на клиента §8.3)", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("src/app/api/subscription/request/route.ts", "utf-8");
    expect(src).toContain("periodTotalEuros");
    expect(src).toContain("amount: clientAmount"); // клиентската сума е преименувана и не се ползва директно
    expect(src).toMatch(/const amount = periodTotalEuros/);
  });
});
