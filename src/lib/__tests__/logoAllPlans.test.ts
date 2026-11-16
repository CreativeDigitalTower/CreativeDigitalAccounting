import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { PLAN_FEATURES, planHasFeature, type PlanId } from "@/lib/constants";
import { resolveCompanyLogo } from "@/lib/companyLogo";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const PLANS: PlanId[] = ["free", "start", "business", "pro"];

describe("Фирменото лого е включено във ВСИЧКИ планове (§1/§5/§A)", () => {
  it("invoice_logo entitlement е наличен за всеки план (вкл. free)", () => {
    for (const p of PLANS) {
      expect(PLAN_FEATURES[p], p).toContain("invoice_logo");
      expect(planHasFeature(p, "invoice_logo"), p).toBe(true);
    }
  });
  it("free планът явно съдържа invoice_logo (§B)", () => {
    expect(PLAN_FEATURES.free).toContain("invoice_logo");
  });
});

describe("Резолверът на лого е независим от плана (§4/§12)", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  it("валидно лого се резолвва еднакво, без оглед на план (резолверът не приема план)", () => {
    // resolveCompanyLogo няма параметър за план → по дизайн не може да зависи от абонамента.
    expect(resolveCompanyLogo(PNG)).toBe(PNG);
    expect(resolveCompanyLogo.length).toBe(1);
  });
});

describe("Планово-независимо лого във всички изгледи (§2/§4 source guarantees)", () => {
  const files = [
    "src/lib/docView.ts",
    "src/app/(app)/dashboard/documents/[id]/page.tsx",
    "src/app/(app)/dashboard/business-docs/doc/[id]/page.tsx",
    "src/app/(app)/dashboard/logistics/mk-invoice/[id]/page.tsx",
    "src/app/d/[token]/page.tsx",
    "src/app/api/business-docs/bulk/route.ts",
  ];
  for (const f of files) {
    it(`${f} вече не гейтва логото по план`, () => {
      const src = read(f);
      expect(src).not.toMatch(/plan !== "free"\s*&&[^\n]*logoUrl/);
    });
  }
  it("sidebar логото се подава без планов гейт", () => {
    const layout = read("src/app/(app)/layout.tsx");
    expect(layout).toContain("logoUrl={company.logoUrl}");
    expect(layout).not.toMatch(/logoUrl=\{plan !== "free"/);
  });
});

describe("Другите ограничения на Free плана остават (§11/§H/§20)", () => {
  it("платените функции НЕ са достъпни за free", () => {
    for (const feat of ["projects", "multicompany", "api", "ai", "employees"]) {
      expect(planHasFeature("free", feat), feat).toBe(false);
    }
  });
  it("start/business/pro все още надвишават free по функции", () => {
    expect(PLAN_FEATURES.start.length).toBeGreaterThan(PLAN_FEATURES.free.length);
    expect(PLAN_FEATURES.pro.length).toBeGreaterThan(PLAN_FEATURES.business.length);
  });
});

describe("Няма противоречиви текстове за логото (§6/§7/§G)", () => {
  it("премахнат е 'само за платените планове' намекът", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${l}/account.json`));
      expect(j.settings.logoPaidHint, l).toBeUndefined();
    }
  });
  it("Free планът изброява фирмено лого като включена функция (§E, 6 езика)", () => {
    const needle: Record<string, RegExp> = {
      bg: /лого/i, en: /logo/i, ru: /логотип/i, ro: /logo/i, tr: /logo/i, el: /λογότυπο/i,
    };
    for (const [l, re] of Object.entries(needle)) {
      const j = JSON.parse(read(`src/locales/${l}/pricing.json`));
      const freeFeatures: string[] = j.plans.free.features;
      expect(freeFeatures.some((f) => re.test(f)), `${l} free features`).toBe(true);
    }
  });
});
