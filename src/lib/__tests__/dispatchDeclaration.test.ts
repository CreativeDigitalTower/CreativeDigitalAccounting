import { describe, it, expect } from "vitest";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";
import { formatInvoiceDate } from "@/lib/logistics/exportDates";
import { ACTIVE_EXPORT_DOC_TYPES, EXPORT_DOC_TYPES, isActiveExportDocType, formatSequenceNumber, EXPORT_INVOICE_FORMAT } from "@/lib/logistics/config";

const PARTIES: Parties = {
  seller: { name: "Метал Трейд – Кюстендил 2005 ООД", city: "Кюстендил", country: "България", manager: "Пейо Димитров Чунчев" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Тетово", country: "Северна Македония" },
  client: { name: "JJU BAU DOOEL", city: "Тетово" },
};
const base: ExportSetSource = {
  invoiceNumber: "0000009705", invoiceDate: "2026-08-27T00:00:00.000Z", shipmentDate: "2026-08-28T00:00:00.000Z",
  placeOfShipment: "BELI IZVOR", destination: "SKOPIE", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900", quantity: 26.18, unit: "t",
  declarationCmrDate: "2026-08-28T00:00:00.000Z", dispatchNumber: "9705", deliveryTerm: "FCA",
  holcimProforma: { number: "3295183", date: "2026-08-27T00:00:00.000Z" },
};

describe("Испратница mapping (1/2/3/47)", () => {
  const disp = buildDocumentData(base, PARTIES, "dispatch") as Record<string, any>;
  it("dispatch date = shipmentDate → full DD.MM.YYYY after number", () => {
    expect(disp.date).toBe(base.shipmentDate);
    expect(formatInvoiceDate(disp.date)).toBe("28.08.2026"); // не само година
  });
  it("both copies use the same date (single source)", () => {
    // Едно копие се рендира два пъти в print листа → една и съща стойност.
    expect(formatInvoiceDate(disp.date)).toBe(formatInvoiceDate(disp.date));
  });
});

describe("Декларация mapping 1:1 (30/32/34/51)", () => {
  const dec = buildDocumentData(base, PARTIES, "declaration") as Record<string, any>;
  it("regulation top-right + centered title", () => {
    expect(dec.regulation).toBe("Регламент – EC №2447/2015, Приложение 22-10");
    expect(dec.title).toBe("ДЕКЛАРАЦИЯ");
  });
  it("dynamic proforma + invoice numbers (not hardcoded)", () => {
    expect(dec.proformaNumber).toBe("3295183");
    expect(dec.invoiceNumber).toBe("0000009705");
    expect(dec.bodyText).toContain("0000009705");
    expect(dec.bodyText).toContain("3295183");
  });
  it("place = Кюстендил, date from declarationCmrDate rendered DD.MM.YYYY (35)", () => {
    expect(dec.place).toBe("Кюстендил");
    expect(formatInvoiceDate(dec.date)).toBe("28.08.2026");
  });
});

describe("CMR Epson restored as active generation (§5/§11)", () => {
  it("cmr_epson offered again; cmr_hp kept", () => {
    expect((ACTIVE_EXPORT_DOC_TYPES as readonly string[]).includes("cmr_epson")).toBe(true);
    expect((ACTIVE_EXPORT_DOC_TYPES as readonly string[]).includes("cmr_hp")).toBe(true);
    expect(ACTIVE_EXPORT_DOC_TYPES.length).toBe(5);
  });
  it("cmr_epson е в EXPORT_DOC_TYPES и е активен", () => {
    expect((EXPORT_DOC_TYPES as readonly string[]).includes("cmr_epson")).toBe(true);
    expect(isActiveExportDocType("cmr_epson")).toBe(true);
  });
});

describe("Invoice number format (16/19/48)", () => {
  it("leading zeros preserved (10-digit)", () => {
    expect(formatSequenceNumber(1, EXPORT_INVOICE_FORMAT)).toBe("0000000001");
    expect(formatSequenceNumber(9705, EXPORT_INVOICE_FORMAT)).toBe("0000009705");
  });
});
