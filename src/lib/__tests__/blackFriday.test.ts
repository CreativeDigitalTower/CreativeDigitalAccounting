import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  BLACK_FRIDAY_2026, blackFridayActive, blackFridayDiscountPercent, blackFridaySavingsEuros,
  effectivePeriodCents, effectivePeriodEuros, periodTotalCents,
} from "@/lib/constants";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const DURING = new Date("2026-11-15T10:00:00+02:00");

describe("Активност на кампанията по абсолютен момент (§2/§14)", () => {
  it("активна по време на кампанията", () => {
    expect(blackFridayActive(DURING)).toBe(true);
  });
  it("неактивна преди старта", () => {
    expect(blackFridayActive(new Date("2026-10-31T23:59:59+02:00"))).toBe(false);
  });
  it("активна точно в 30.11.2026 23:59:59 Europe/Sofia", () => {
    expect(blackFridayActive(new Date("2026-11-30T23:59:59+02:00"))).toBe(true);
  });
  it("неактивна в 01.12.2026 00:00:00 Europe/Sofia", () => {
    expect(blackFridayActive(new Date("2026-12-01T00:00:00+02:00"))).toBe(false);
  });
  it("краят е 30.11.2026 23:59:59 +02:00 (EET)", () => {
    expect(BLACK_FRIDAY_2026.endsAt.toISOString()).toBe("2026-11-30T21:59:59.000Z");
  });
});

// §4 — деветте одобрени промоционални суми (в евроцентове), точно.
describe("Black Friday промоционални цени (§4)", () => {
  const expectCents: Record<string, Record<string, number>> = {
    start:    { monthly: 392, semiannual: 1955, annual: 2117 },
    business: { monthly: 1992, semiannual: 9935, annual: 13446 },
    pro:      { monthly: 6715, semiannual: 33773, annual: 51192 },
  };
  for (const plan of ["start", "business", "pro"] as const) {
    for (const period of ["monthly", "semiannual", "annual"] as const) {
      it(`${plan} ${period} = ${expectCents[plan][period]} цента`, () => {
        expect(effectivePeriodCents(plan, period, DURING)).toBe(expectCents[plan][period]);
      });
    }
  }
  it("Free остава 0 на всички периоди", () => {
    for (const p of ["monthly", "semiannual", "annual"] as const) {
      expect(effectivePeriodCents("free", p, DURING)).toBe(0);
    }
  });
  it("евро стойностите съвпадат с таблиците", () => {
    expect(effectivePeriodEuros("start", "annual", DURING)).toBe(21.17);
    expect(effectivePeriodEuros("business", "annual", DURING)).toBe(134.46);
    expect(effectivePeriodEuros("pro", "annual", DURING)).toBe(511.92);
    expect(effectivePeriodEuros("pro", "semiannual", DURING)).toBe(337.73);
  });
});

describe("Отстъпки, спестявания и без натрупване (§4)", () => {
  it("процентите са одобрените", () => {
    expect(blackFridayDiscountPercent("start", "annual", DURING)).toBe(60);
    expect(blackFridayDiscountPercent("business", "annual", DURING)).toBe(50);
    expect(blackFridayDiscountPercent("pro", "annual", DURING)).toBe(40);
    expect(blackFridayDiscountPercent("start", "monthly", DURING)).toBe(20);
    expect(blackFridayDiscountPercent("pro", "monthly", DURING)).toBe(15);
  });
  it("отстъпката е спрямо редовната КРАЙНА цена за периода, без допълнителни 5/10% (§4)", () => {
    // годишен старт: редовна крайна 52,92 (вече с −10%); BF −60% върху нея = 21,17
    expect(periodTotalCents("start", "annual")).toBe(5292);
    expect(effectivePeriodCents("start", "annual", DURING)).toBe(2117);
  });
  it("спестяванията са редовна − промоционална", () => {
    expect(blackFridaySavingsEuros("start", "annual", DURING)).toBeCloseTo(31.75, 2);
    expect(blackFridaySavingsEuros("business", "annual", DURING)).toBeCloseTo(134.46, 2);
    expect(blackFridaySavingsEuros("pro", "annual", DURING)).toBeCloseTo(341.28, 2);
  });
});

describe("След кампанията → редовни цени (§14)", () => {
  const AFTER = new Date("2026-12-05T10:00:00+02:00");
  it("ефективната цена == редовната", () => {
    for (const plan of ["start", "business", "pro"] as const) {
      for (const period of ["monthly", "semiannual", "annual"] as const) {
        expect(effectivePeriodCents(plan, period, AFTER)).toBe(periodTotalCents(plan, period));
      }
    }
  });
  it("няма отстъпка/спестяване след края", () => {
    expect(blackFridayDiscountPercent("start", "annual", AFTER)).toBe(0);
    expect(blackFridaySavingsEuros("pro", "annual", AFTER)).toBe(0);
  });
});

describe("Интеграции — сървърна авторитетност и лента (§10/§6/§14)", () => {
  it("платежната заявка смята ефективната сума на сървъра със сървърно време", () => {
    const src = read("src/app/api/subscription/request/route.ts");
    expect(src).toContain("effectivePeriodEuros");
    expect(src).toContain("blackFridayActive");
    expect(src).toMatch(/const now = new Date\(\)/);
    expect(src).toContain("const amount = effectivePeriodEuros");
  });
  it("промо офертата има краен срок (validUntil) до края на кампанията (§10)", () => {
    const src = read("src/app/api/subscription/request/route.ts");
    expect(src).toContain("validUntil: bfActive ? BLACK_FRIDAY_2026.endsAt");
    const pf = read("src/lib/subscriptionProforma.ts");
    expect(pf).toContain("validUntil");
  });
  it("лентата се скрива автоматично извън кампанията (gated on blackFridayActive)", () => {
    const bar = read("src/components/marketing/BlackFridayBar.tsx");
    expect(bar).toContain("blackFridayActive()");
    expect(bar).toContain("sessionStorage");
  });
  it("UI картите ползват централните BF helper-и, без паралелна ценова логика (§5)", () => {
    for (const f of ["src/components/marketing/Pricing.tsx", "src/components/app/SubscriptionPlans.tsx"]) {
      const src = read(f);
      expect(src).toContain("effectivePeriodEuros");
      expect(src).toContain("blackFridayActive");
    }
  });
});

describe("i18n — BF ключове във всички 6 езика (§13)", () => {
  const locales = ["bg", "en", "ru", "ro", "tr", "el"];
  const keys = ["badge", "save", "bestOffer", "tagline", "annualPitch", "endsNote", "barFull", "barCompact", "barCta", "barCtaShort", "dismiss", "calloutStrong", "calloutText"];
  for (const l of locales) {
    it(`${l} има pricing.bf.*`, () => {
      const j = JSON.parse(read(`src/locales/${l}/pricing.json`));
      expect(j.bf).toBeTruthy();
      for (const k of keys) expect(j.bf[k], `${l}.bf.${k}`).toBeTruthy();
      expect(j.sub.monthlyEquiv, `${l}.sub.monthlyEquiv`).toBeTruthy();
    });
  }
});
