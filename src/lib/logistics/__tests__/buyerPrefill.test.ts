import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const single = read("src/app/api/logistics/export-sets/received/[id]/invoice-prefill/route.ts");
const bulk = read("src/app/api/logistics/export-sets/received/bulk-prefill/route.ts");
const form = read("src/app/(app)/dashboard/documents/new/page.tsx");
const lib = read("src/lib/logistics/deliveryInvoice.ts");

describe("Shared buyer prefill — city/MOL (§4/§5/§8)", () => {
  it("1/5/6) single prefill връща пълен buyer обект (city/mol/address) чрез shared loader", () => {
    expect(single).toContain("loadBuyerPrefill(g.companyId, matchedClientId)");
    expect(single).toContain("buyer,");
  });
  it("2/8) bulk prefill връща СЪЩИЯ shared buyer обект (не само id/name)", () => {
    expect(bulk).toContain("loadBuyerPrefill(g.companyId, clientId)");
    expect(bulk).toContain("buyer,");
  });
  it("shared loader чете Client.city/mol/address (реалните полета, §3)", () => {
    expect(lib).toContain("city: true, address: true, mol: true");
    expect(lib).toContain("city: c.city ?? \"\"");
    expect(lib).toContain("mol: c.mol ?? \"\"");
  });
});

describe("Form: buyer обектът попълва полетата без race (§3/§4/§9/§10)", () => {
  it("3) applyBuyer задава city/mol/address директно в mClient", () => {
    expect(form).toContain("function applyBuyer");
    expect(form).toContain("city: b.city");
    expect(form).toContain("mol: b.mol");
  });
  it("4/9) двата flow ползват d.buyer директно (без втори /api/clients fetch)", () => {
    expect(form).toContain("if (d.buyer) applyBuyer(d.buyer)");
    // В bulk effect също.
    expect(form.split("if (d.buyer) applyBuyer(d.buyer)").length - 1).toBe(2);
  });
  it("10/11) НЕ се чете destination/адрес като град (§6) — градът идва само от Client.city", () => {
    expect(lib).not.toContain("destination");
    // Не парсва адрес за град.
    expect(lib).not.toMatch(/address.*split|split.*address/);
  });
  it("2/10) issuer city ≠ buyer city — applyBuyer не пипа issuer snapshot", () => {
    expect(form).not.toContain("issuerCity");
  });
});

describe("Safety / consistency (§13/§19/§20)", () => {
  it("без hardcode на конкретен клиент/град (данните) в prefill-ите и loader-а", () => {
    for (const s of [single, bulk, lib]) {
      expect(s).not.toContain("Куманово");
      expect(s).not.toContain("ДПГУ");
      expect(s).not.toContain("БЕТОН ГРАДБА");
    }
  });
  it("buyer loader е company-scoped (tenant isolation, §19)", () => {
    expect(lib).toContain("findFirst({\n    where: { id: clientId, companyId }");
  });
  it("15/16) MK език/валута default остават (не се пипат от buyer prefill)", () => {
    expect(bulk).toContain("getDefaultDocumentLanguage(company)");
    expect(bulk).toContain('company?.defaultCurrency ?? "MKD"');
  });
});
