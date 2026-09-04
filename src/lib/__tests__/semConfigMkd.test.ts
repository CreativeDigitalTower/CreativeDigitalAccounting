import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { CURRENCIES, formatCurrency, VAT_RATES } from "@/lib/constants";
import { isExportCreateAllowed } from "@/lib/logistics/exportPermissions";

const LOCALES = ["bg", "en", "ru", "ro", "tr", "el"] as const;
const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("MKD currency — global support (§2/§4)", () => {
  it("A) MKD is a selectable platform currency (not logistics-only)", () => {
    const mkd = CURRENCIES.find((c) => c.code === "MKD");
    expect(mkd).toBeTruthy();
    expect(mkd!.label).toContain("MKD");
  });
  it("keeps existing currencies (EUR still present)", () => {
    expect(CURRENCIES.some((c) => c.code === "EUR")).toBe(true);
  });
  it("B) every locale has a real MKD label (no raw enums.currency.MKD key)", () => {
    for (const l of LOCALES) {
      const enums = JSON.parse(read(`src/locales/${l}/enums.json`));
      expect(enums.currency?.MKD, `MKD label missing in ${l}`).toBeTruthy();
      expect(enums.currency.MKD).not.toContain("enums.currency");
      expect(enums.currency.MKD).toContain("MKD");
    }
  });
  it("money formatter renders MKD amounts via Intl (real business logic)", () => {
    const out = formatCurrency(1234.5, "MKD");
    expect(out).toMatch(/1[\s., ]?234/);
    expect(out.toUpperCase()).toContain("MKD");
  });
});

describe("VAT rates — 18% supported centrally (§3)", () => {
  it("E) 18 is a valid VAT option in the single source list", () => {
    expect((VAT_RATES as readonly number[]).includes(18)).toBe(true);
  });
  it("keeps the existing BG rates (20/9/0)", () => {
    for (const r of [20, 9, 0]) expect((VAT_RATES as readonly number[]).includes(r)).toBe(true);
  });
  it("F) document forms render the VAT dropdown from VAT_RATES (editable, no hardcode)", () => {
    for (const p of [
      "src/app/(app)/dashboard/documents/new/page.tsx",
      "src/app/(app)/dashboard/documents/[id]/edit/page.tsx",
    ]) {
      const s = read(p);
      expect(s).toContain("VAT_RATES");
      expect(s).not.toMatch(/<option value=\{20\}>20%<\/option>/); // old hardcoded block gone
    }
  });
});

describe("Company defaults flow into the new-document form (§3/§5)", () => {
  const s = read("src/app/(app)/dashboard/documents/new/page.tsx");
  it("C) new document currency comes from Company.defaultCurrency (editable)", () => {
    expect(s).toContain("setCurrency(c.defaultCurrency)");
    expect(s).toContain("CURRENCIES.map"); // currency selector still present → editable
  });
  it("D) new invoice rows start at Company.defaultVatRate", () => {
    expect(s).toContain("setDefaultVatRate(c.defaultVatRate)");
    expect(s).toMatch(/vatRate:\s*c\.defaultVatRate/);
  });
  it('"no VAT" toggle restores the company default rate when re-enabled (§5)', () => {
    expect(s).toMatch(/e\.target\.checked \? 0 : defaultVatRate/);
  });
  it("company profile exposes the default VAT rate (§6)", () => {
    const v = read("src/components/app/VatSettings.tsx");
    expect(v).toContain("defaultVatRate");
    expect(v).toContain("account.vat.defaultRateLabel");
    const api = read("src/app/api/company/vat-settings/route.ts");
    expect(api).toContain("defaultVatRate");
  });
});

describe("Export-create permission rule (§1/§10/§13)", () => {
  it("I) Metal Trade (default true/null/undefined) may create exports", () => {
    expect(isExportCreateAllowed(undefined)).toBe(true);
    expect(isExportCreateAllowed(null)).toBe(true);
    expect(isExportCreateAllowed(true)).toBe(true);
  });
  it("H) SEM (explicit false) cannot create exports", () => {
    expect(isExportCreateAllowed(false)).toBe(false);
  });
  it("export-sets POST enforces companyCanCreateExports (403)", () => {
    const s = read("src/app/api/logistics/export-sets/route.ts");
    expect(s).toContain("companyCanCreateExports");
    expect(s).toMatch(/status:\s*403/);
  });
  it("export/new page redirects when company cannot create", () => {
    const s = read("src/app/(app)/dashboard/logistics/export/new/page.tsx");
    expect(s).toContain("companyCanCreateExports");
  });
});

describe("Sidebar structure (§8/§9/§10/§11)", () => {
  const s = read("src/components/app/Sidebar.tsx");
  it("§8) Clients (CRM) is back in the Sales group, not under Finance, no accent", () => {
    const salesIdx = s.indexOf("navigation.groups.sales");
    const finIdx = s.indexOf("navigation.groups.finance");
    const clientsIdx = s.indexOf('href: "/dashboard/clients"');
    expect(clientsIdx).toBeGreaterThan(salesIdx);
    expect(clientsIdx).toBeLessThan(finIdx); // inside Sales, before Finance
    expect(s).not.toContain("sb-accent"); // per-item CRM accent removed
  });
  it("J) logistics section is inserted right after Finance (→ before Operations)", () => {
    expect(s).toContain('findIndex((g) => g.titleKey === "navigation.groups.finance")');
    expect(s).toContain("groups.splice(insertAt, 0, ...specialModules)");
  });
  it("§11) logistics group carries a discreet accent flag", () => {
    expect(s).toMatch(/navigation\.groups\.logistics", accent: true/);
    const css = read("src/app/globals.css");
    expect(css).toContain(".sb-group-accent");
  });
  it("K) logistics group is null unless the module is enabled (visibility gated)", () => {
    expect(s).toContain("logisticsEnabled ?");
    expect(s).toContain(": null");
  });
});
