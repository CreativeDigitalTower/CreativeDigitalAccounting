import { describe, it, expect } from "vitest";
import { formatInvoiceDate, formatDeclarationDate } from "@/lib/logistics/exportDates";
import { toISODateLocal, todayISODate } from "@/lib/date/week";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

describe("export dates — formatters (14/17/18/19)", () => {
  it("invoice date -> DD.MM.YYYY with dots and leading zeros", () => {
    expect(formatInvoiceDate("2026-08-24T00:00:00.000Z")).toBe("24.08.2026");
    expect(formatInvoiceDate("2026-01-05")).toBe("05.01.2026");
  });
  it("declaration date -> YYYY.MM.DD (different rule)", () => {
    expect(formatDeclarationDate("2026-08-24T00:00:00.000Z")).toBe("2026.08.24");
    expect(formatDeclarationDate("2026-01-05")).toBe("2026.01.05");
  });
  it("invoice and declaration formats differ for same date", () => {
    const s = "2026-08-24";
    expect(formatInvoiceDate(s)).not.toBe(formatDeclarationDate(s));
  });
  it("empty / invalid -> empty string", () => {
    expect(formatInvoiceDate(null)).toBe("");
    expect(formatDeclarationDate(undefined)).toBe("");
    expect(formatInvoiceDate("not-a-date")).toBe("");
  });
});

describe("local ISO date (32) — timezone-safe", () => {
  it("toISODateLocal uses local calendar components", () => {
    const d = new Date(2026, 7, 24, 23, 30); // 24 Aug local, late evening
    expect(toISODateLocal(d)).toBe("2026-08-24");
  });
  it("todayISODate matches local today", () => {
    const n = new Date();
    expect(todayISODate()).toBe(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`);
  });
});

const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Sofia", country: "Bulgaria", manager: "PEYO CHUNCHEV" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Skopje", country: "North Macedonia" },
  client: { name: "JJU BAU DOOEL", city: "Tetovo" },
};
const base: ExportSetSource = {
  invoiceNumber: "0000009668", invoiceDate: "2026-08-24T00:00:00.000Z", shipmentDate: "2026-08-28T00:00:00.000Z",
  placeOfShipment: "BELI IZVOR", destination: "SKOPIE", truckRegSnapshot: "CB0639AT", trailerReg: "CB2649EA",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900", quantity: 25.82, unit: "t",
  declarationCmrDate: "2026-08-24T00:00:00.000Z", dispatchNumber: "9668", deliveryTerm: "FCA",
};

describe("document data mapping (4/5/7/18)", () => {
  it("Dispatch 'Денес' date = shipmentDate, not invoiceDate", () => {
    const disp = buildDocumentData(base, PARTIES, "dispatch") as Record<string, any>;
    expect(disp.date).toBe(base.shipmentDate);
    expect(disp.date).not.toBe(base.invoiceDate);
  });
  it("Invoice carries declarationDate from declarationCmrDate", () => {
    const inv = buildDocumentData(base, PARTIES, "invoice") as Record<string, any>;
    expect(inv.declarationDate).toBe(base.declarationCmrDate);
    expect(formatDeclarationDate(inv.declarationDate)).toBe("2026.08.24");
  });
  it("Invoice header preserves leading-zero invoice number", () => {
    const inv = buildDocumentData(base, PARTIES, "invoice") as Record<string, any>;
    expect(inv.invoiceNumber).toBe("0000009668");
    expect(formatInvoiceDate(inv.invoiceDate)).toBe("24.08.2026");
  });
  it("Invoice still stores dateOfShipment in data (not deleted, just not displayed)", () => {
    const inv = buildDocumentData(base, PARTIES, "invoice") as Record<string, any>;
    expect(inv.dateOfShipment).toBe(base.shipmentDate);
  });
});
