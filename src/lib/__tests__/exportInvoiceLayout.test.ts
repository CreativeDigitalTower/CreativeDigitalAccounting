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
  it("root uses A4 portrait geometry with border-box + overflow hidden (10/17-20)", () => {
    expect(html).toContain("width:210mm");
    expect(html).toContain("height:297mm");
    expect(html).toContain("box-sizing:border-box");
    expect(html).toContain("overflow:hidden");
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
});
