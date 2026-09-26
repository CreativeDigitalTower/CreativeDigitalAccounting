import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportInvoiceTemplate, type InvoiceDocData } from "@/components/app/logistics/ExportInvoiceTemplate";

const data: InvoiceDocData = {
  invoiceNumber: "0000000009200", invoiceDate: "2026-08-31T00:00:00.000Z",
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", address: "23 Kaloyan Str.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", address: "55 Marshal Tito Str.", city: "Tetovo", country: "North Macedonia" },
  termsOfDelivery: "FCA SKOPIE", truck: "SK832UU / SK5021AE", placeOfShipment: "BELI IZVOR",
  destination: "SKOPIE", destinationCountry: "North Macedonia", declarationDate: "2026-08-31T00:00:00.000Z",
  goods: [{ description: "CEMENT CEM II A-LL 42.5 R - IN BULK", quantity: 27, unit: "t", unitPrice: 100, value: 2700, currency: "EUR", certificate: "2032-CPR-19.135C" }],
  vatText: "Export, Art.28 Bulgarian VAT Legislation", vatRate: 0, paymentConditions: "Bank transfer", manager: "ПЕЙО ЧУНЧЕВ",
};
const html = renderToStaticMarkup(h(ExportInvoiceTemplate, { data }));

describe("Export Invoice layout — 1:1 & single A4 (46)", () => {
  it("root uses A4 width + border-box, but does NOT force full page height (blank Page 2 fix)", () => {
    expect(html).toContain("width:210mm");
    expect(html).toContain("box-sizing:border-box");
    // Съдържанието определя височината (< A4) → без празна 2-ра страница при печат.
    expect(html).not.toContain("height:297mm");
  });
  it("Date of shipment се визуализира между Place of shipment и Destination (§5)", () => {
    expect(html).toContain("Date of shipment :");
    const place = html.indexOf("Place of shipment");
    const dateShip = html.indexOf("Date of shipment");
    const dest = html.indexOf("Destination :");
    expect(place).toBeGreaterThan(0);
    expect(dateShip).toBeGreaterThan(place);
    expect(dest).toBeGreaterThan(dateShip);
  });
  it("Date of shipment по подразбиране = invoice date, формат DD.MM.YYYY (§6/§7)", () => {
    // Тук data няма dateOfShipment → fallback към invoiceDate (31.08.2026).
    const seg = html.slice(html.indexOf("Date of shipment"), html.indexOf("Destination :"));
    expect(seg).toContain("31.08.2026");
    expect(seg).not.toContain("2026-08-31");
  });
  it("is a single continuous frame — exactly one table (3/33)", () => {
    expect((html.match(/<table/g) || []).length).toBe(1);
  });
  it("Terms section is inside the framed table (2/3)", () => {
    const tOpen = html.indexOf("<table"), tClose = html.indexOf("</table>");
    const terms = html.indexOf("Terms of delivery");
    expect(terms).toBeGreaterThan(tOpen);
    expect(terms).toBeLessThan(tClose);
  });
  it("Payment conditions and signature are inside the frame, after TOTAL (10/11/12)", () => {
    const tClose = html.indexOf("</table>");
    const total = html.indexOf("TOTAL :");
    const pay = html.indexOf("Payment conditions");
    const sign = html.indexOf("Sign. &amp; Stamp");
    expect(total).toBeGreaterThan(0);
    expect(pay).toBeGreaterThan(total);       // payment after TOTAL
    expect(pay).toBeLessThan(tClose);         // inside the table frame
    expect(sign).toBeGreaterThan(0);
    expect(sign).toBeLessThan(tClose);        // signature inside the table frame
  });
  it("VAT row + TOTAL grid present (7/8/9)", () => {
    expect(html).toContain("VAT 0,00 %");
    expect(html).toContain("Export, Art.28 Bulgarian VAT Legislation");
    expect(html).toContain("TOTAL :");
  });
  it("keeps approved date formats (27/28)", () => {
    expect(html).toContain("31.08.2026");   // invoice header DD.MM.YYYY
    expect(html).toContain("2026.08.31");   // declaration YYYY.MM.DD
    expect(html).not.toContain("31/08/2026");
  });
  it("quantity keeps 3 decimals (29)", () => {
    expect(html).toContain("27.000");
  });
  it("preserves full invoice number with leading zeros (28)", () => {
    expect(html).toContain("0000000009200");
  });
  it("Terms of delivery + Destination остават непроменени (§8)", () => {
    expect(html).toContain("FCA SKOPIE");
    expect(html).toContain("Destination :");
    expect(html).toContain("North Macedonia");
  });
});

describe("Date of shipment — explicit shipmentDate се ползва пред invoice date (§6)", () => {
  const html2 = renderToStaticMarkup(h(ExportInvoiceTemplate, { data: { ...data, dateOfShipment: "2026-09-03T00:00:00.000Z" } }));
  it("показва 03.09.2026, не invoice date", () => {
    const seg = html2.slice(html2.indexOf("Date of shipment"), html2.indexOf("Destination :"));
    expect(seg).toContain("03.09.2026");
  });
});

describe("Print A4 geometry (§1/§2/§7/§12) — source assertions", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const printSrc = fs.readFileSync("src/app/(app)/dashboard/logistics/export/[id]/[docType]/print/page.tsx", "utf-8");
  const tplSrc = fs.readFileSync("src/components/app/logistics/ExportInvoiceTemplate.tsx", "utf-8");
  it("print CSS ползва A4 portrait", () => { expect(printSrc).toContain("size: A4 portrait"); });
  it("при печат НЕ форсира пълна височина (min-height: 0 / height: auto)", () => {
    expect(printSrc).toContain("min-height: 0 !important");
    expect(printSrc).toContain("height: auto !important");
  });
  it("има break-inside: avoid защита срещу разделяне/празна страница", () => {
    expect(printSrc).toContain("break-inside: avoid");
    expect(printSrc).toContain("page-break-inside: avoid");
  });
  it("invoice template вече НЕ съдържа фиксирано height: 297mm (root cause)", () => {
    expect(tplSrc).not.toContain('height: "297mm"');
  });
});
