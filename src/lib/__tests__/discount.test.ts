import { describe, it, expect } from "vitest";
import { multiCompanyDiscount, applyDiscount, clampPercent } from "@/lib/discount";

describe("multiCompanyDiscount — текущо правило", () => {
  it("първата платена фирма (paidCount 0) → 100%", () => {
    expect(multiCompanyDiscount(0)).toEqual({ percent: 100, reason: "multi_company_first" });
  });
  it("втора и всяка следваща → 50%", () => {
    expect(multiCompanyDiscount(1)).toEqual({ percent: 50, reason: "multi_company_additional" });
    expect(multiCompanyDiscount(5)).toEqual({ percent: 50, reason: "multi_company_additional" });
  });
});

describe("applyDiscount — гъвкава разбивка", () => {
  it("50% отстъпка", () => {
    expect(applyDiscount(20, 50)).toEqual({ standard: 20, discount: 10, final: 10, percent: 50 });
  });
  it("100% отстъпка → крайна цена 0", () => {
    expect(applyDiscount(29, 100)).toEqual({ standard: 29, discount: 29, final: 0, percent: 100 });
  });
  it("без отстъпка", () => {
    expect(applyDiscount(49, 0)).toEqual({ standard: 49, discount: 0, final: 49, percent: 0 });
  });
  it("поддържа произволен процент (напр. 25/30) — за бъдещи кампании", () => {
    expect(applyDiscount(40, 25)).toEqual({ standard: 40, discount: 10, final: 30, percent: 25 });
    expect(applyDiscount(50, 30)).toEqual({ standard: 50, discount: 15, final: 35, percent: 30 });
  });
});

describe("clampPercent", () => {
  it("ограничава 0–100 и закръгля", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(49.6)).toBe(50);
    expect(clampPercent(null)).toBe(0);
  });
});
