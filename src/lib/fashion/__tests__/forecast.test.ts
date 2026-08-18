import { describe, it, expect } from "vitest";
import { avgMonthlySales, stockCoverDays, suggestedProduction } from "@/lib/fashion/forecast";

describe("Fashion Forecast — stock cover (§25)", () => {
  it("средни месечни продажби = продадени / месеци", () => {
    expect(avgMonthlySales(63, 3)).toBe(21);
    expect(avgMonthlySales(0, 3)).toBe(0);
    expect(avgMonthlySales(10, 0)).toBe(0);
  });
  it("покритие в дни (наличност 8, средно 21/месец → ~11 дни)", () => {
    expect(stockCoverDays(8, 21)).toBe(11.4);
    expect(stockCoverDays(30, 30)).toBe(30);
  });
  it("без продажби → без покритие (null)", () => {
    expect(stockCoverDays(8, 0)).toBe(null);
  });
});

describe("Fashion Forecast — препоръчано производство (§26)", () => {
  it("target = средни × целеви месеци; suggested = target − наличност", () => {
    // средно 21/мес, цел 2 мес → target 42; наличност 8 → 34
    expect(suggestedProduction(8, 21, 0, 2)).toBe(34);
  });
  it("минималната наличност е долна граница на целта", () => {
    // средно 0 → target = minStock 20; наличност 5 → 15
    expect(suggestedProduction(5, 0, 20, 2)).toBe(15);
  });
  it("достатъчна наличност → 0", () => {
    expect(suggestedProduction(100, 21, 10, 2)).toBe(0);
  });
  it("закръгля нагоре", () => {
    // средно 10.5 × 2 = 21; наличност 0.5 → 20.5 → 21
    expect(suggestedProduction(0.5, 10.5, 0, 2)).toBe(21);
  });
});
