import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildInvoiceViewData, type MkDocForView } from "@/lib/logistics/mkInvoiceView";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const baseDoc = (over: Partial<MkDocForView> = {}): MkDocForView => ({
  type: "invoice", number: "0000000741", issueDate: new Date("2026-09-02"), taxEventDate: null, dueDate: null,
  currency: "MKD", paymentMethod: "bank_transfer", notes: null, template: "classic", language: "mk",
  vatExempt: false, vatExemptReason: null, clientIsIndividual: false,
  company: { name: "SEM", mol: "ЖИВ КОМПАНИ", address: "ул.", city: "ЖИВ ГРАД", eik: null, vatRegistered: false, vatNumber: null, bankIban: null, bankName: null, bankBic: null, phone: null, email: null, website: null, logoUrl: null },
  client: null, lines: [], ...over,
});

describe("Issuer snapshot в document рендера (§6/§7/§19)", () => {
  it("11/12/13) snapshot city/mol имат приоритет пред живите Company данни", () => {
    const d = buildInvoiceViewData(baseDoc({ issuerCity: "Скопје", issuerMol: "Иван Иванов" }), { vatExemptReasonText: null, showLogo: false });
    expect(d.company.city).toBe("Скопје");
    expect(d.company.mol).toBe("Иван Иванов");
  });
  it("19) стар документ (snapshot null) → fallback към живите Company данни (byte-unchanged)", () => {
    const d = buildInvoiceViewData(baseDoc({ issuerCity: null, issuerMol: null }), { vatExemptReasonText: null, showLogo: false });
    expect(d.company.city).toBe("ЖИВ ГРАД");
    expect(d.company.mol).toBe("ЖИВ КОМПАНИ");
  });
  it("3) липсващ MOL (и snapshot, и live null) → празно, без измисляне", () => {
    const d = buildInvoiceViewData(baseDoc({ issuerMol: null, company: { ...baseDoc().company, mol: null } }), { vatExemptReasonText: null, showLogo: false });
    expect(d.company.mol == null || d.company.mol === "").toBe(true);
  });
  it("17/18) Unicode град/управител се пазят (Скопје, München)", () => {
    const d = buildInvoiceViewData(baseDoc({ issuerCity: "München", issuerMol: "Đorđe Ćirić" }), { vatExemptReasonText: null, showLogo: false });
    expect(d.company.city).toBe("München");
    expect(d.company.mol).toBe("Đorđe Ćirić");
  });
});

describe("source: snapshot capture + render fallback + schema (§2/§6/§7/§18)", () => {
  it("1/2/4) POST /api/documents снапшотва issuerCity/issuerMol от Company (не от user)", () => {
    const api = read("src/app/api/documents/route.ts");
    expect(api).toContain("select: { invoiceTemplate: true, city: true, mol: true }");
    expect(api).toContain("const issuerCity = comp?.city ?? null");
    expect(api).toContain("const issuerMol = comp?.mol ?? null");
    expect(api).toContain("issuerCity, issuerMol,");
    // Не ползва логнатия потребител като МОЛ (§5).
    expect(api).not.toContain("issuerMol = userId");
  });
  it("7/14/15) всички render сайтове ползват snapshot ?? live", () => {
    for (const p of ["src/app/(app)/dashboard/documents/[id]/page.tsx", "src/app/d/[token]/page.tsx", "src/lib/logistics/mkInvoiceView.ts"]) {
      const s = read(p);
      expect(s).toContain("doc.issuerCity ?? doc.company.city");
      expect(s).toContain("doc.issuerMol ?? doc.company.mol");
    }
  });
  it("18) схема: Document.issuerCity/issuerMol additive nullable", () => {
    const s = read("prisma/schema.prisma");
    expect(s).toMatch(/issuerCity\s+String\?/);
    expect(s).toMatch(/issuerMol\s+String\?/);
  });
  it("Company има city + mol (реалните полета, §2)", () => {
    const s = read("prisma/schema.prisma");
    expect(s).toMatch(/model Company[\s\S]*?\bcity\s+String\?/);
    expect(s).toMatch(/model Company[\s\S]*?\bmol\s+String\?/);
  });
  it("14) mk/pdf.json има MOL label", () => {
    const mk = JSON.parse(read("src/locales/mk/pdf.json"));
    expect(typeof mk.mol).toBe("string");
    expect(mk.mol.length).toBeGreaterThan(0);
  });
  it("19) без hardcode на SEM/Скопје в source-а", () => {
    const api = read("src/app/api/documents/route.ts");
    expect(api).not.toContain("SEM");
    expect(api).not.toContain("Скопје");
  });
});
