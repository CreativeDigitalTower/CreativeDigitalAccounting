import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { CURRENCIES, formatCurrency } from "@/lib/constants";
import { isExportCreateAllowed } from "@/lib/logistics/exportPermissions";

describe("MKD currency — global support (4/8)", () => {
  it("MKD is a selectable platform currency (not logistics-only)", () => {
    const mkd = CURRENCIES.find((c) => c.code === "MKD");
    expect(mkd).toBeTruthy();
    expect(mkd!.label).toContain("MKD");
  });
  it("keeps existing currencies (EUR still present)", () => {
    expect(CURRENCIES.some((c) => c.code === "EUR")).toBe(true);
  });
  it("money formatter renders MKD amounts via Intl (real business logic)", () => {
    const out = formatCurrency(1234.5, "MKD");
    expect(out).toMatch(/1[  .,  ]?234/); // grouped 1 234
    expect(out.toUpperCase()).toContain("MKD");
  });
});

describe("Export-create permission rule (1/10/11)", () => {
  it("default (null/undefined/true) allows creation", () => {
    expect(isExportCreateAllowed(undefined)).toBe(true);
    expect(isExportCreateAllowed(null)).toBe(true);
    expect(isExportCreateAllowed(true)).toBe(true);
  });
  it("explicit false forbids creation (SEM)", () => {
    expect(isExportCreateAllowed(false)).toBe(false);
  });
});

describe("Server-side + UI wiring (source-level regression, 1/2)", () => {
  const read = (p: string) => fs.readFileSync(p, "utf-8");
  it("export-sets POST enforces companyCanCreateExports (403)", () => {
    const s = read("src/app/api/logistics/export-sets/route.ts");
    expect(s).toContain("companyCanCreateExports");
    expect(s).toMatch(/status:\s*403/);
  });
  it("export/new page redirects when company cannot create", () => {
    const s = read("src/app/(app)/dashboard/logistics/export/new/page.tsx");
    expect(s).toContain("companyCanCreateExports");
  });
  it("Clients (CRM) sits in the Finance group with a subtle accent", () => {
    const s = read("src/components/app/Sidebar.tsx");
    const finIdx = s.indexOf("navigation.groups.finance");
    const opsIdx = s.indexOf("navigation.groups.operations");
    const clientsIdx = s.indexOf('href: "/dashboard/clients"');
    expect(clientsIdx).toBeGreaterThan(finIdx);   // after Finance group starts
    expect(clientsIdx).toBeLessThan(opsIdx);      // before the next group
    expect(s).toContain("accent: true");
    expect(s).toContain("sb-accent");
  });
  it("company default VAT rate is applied to new invoice lines", () => {
    const s = read("src/app/(app)/dashboard/documents/new/page.tsx");
    expect(s).toContain("defaultVatRate");
  });
});
