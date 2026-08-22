import { describe, it, expect } from "vitest";
import { resolveDestination, destinationEn, invoiceDeliveryTerms, isDeliveryTerm, FCA_DESTINATION } from "@/lib/logistics/deliveryTerms";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

describe("resolveDestination (§2/§3)", () => {
  it("CASE A: FCA → дестинация винаги Враца", () => {
    expect(resolveDestination("FCA", null)).toBe(FCA_DESTINATION);
    expect(resolveDestination("FCA", "Skopje")).toBe(FCA_DESTINATION);
  });
  it("CASE B: CPT → подадената дестинация", () => {
    expect(resolveDestination("CPT", "SKOPIE")).toBe("SKOPIE");
  });
  it("CASE C: CPT + ръчна дестинация", () => {
    expect(resolveDestination("CPT", "SKOPIE, Industrial Zone 12")).toBe("SKOPIE, Industrial Zone 12");
  });
  it("CPT без дестинация → null", () => { expect(resolveDestination("CPT", "")).toBeNull(); });
});

describe("destinationEn / invoiceDeliveryTerms (§9)", () => {
  it("Враца → VRATSA; Скопие → SKOPIE", () => {
    expect(destinationEn("Враца")).toBe("VRATSA");
    expect(destinationEn("Скопие")).toBe("SKOPIE");
  });
  it("CASE F: FCA -> FCA VRATSA", () => {
    expect(invoiceDeliveryTerms("FCA", "Враца", "legacy")).toBe("FCA VRATSA");
  });
  it("CPT -> CPT SKOPIE", () => {
    expect(invoiceDeliveryTerms("CPT", "SKOPIE", "legacy")).toBe("CPT SKOPIE");
  });
  it("legacy без term → fallback", () => {
    expect(invoiceDeliveryTerms(null, "X", "FCA KYUSTENDIL")).toBe("FCA KYUSTENDIL");
    expect(isDeliveryTerm("XX")).toBe(false);
  });
});

const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Tetovo", country: "North Macedonia" },
  client: null,
};
const base: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-12T00:00:00.000Z", shipmentDate: null,
  destination: "Враца", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900", quantity: 26.04, unit: "t",
  declarationCmrDate: null, dispatchNumber: "9617",
};

describe("Invoice mapping — Terms of delivery (§9/§24)", () => {
  it("CASE F: FCA + Vratsa -> Terms of delivery FCA VRATSA", () => {
    const inv = buildDocumentData({ ...base, deliveryTerm: "FCA", destination: "Враца" }, PARTIES, "invoice") as Record<string, any>;
    expect(inv.termsOfDelivery).toBe("FCA VRATSA");
    expect(inv.destination).toBe("VRATSA");
  });
  it("CPT + SKOPIE -> CPT SKOPIE", () => {
    const inv = buildDocumentData({ ...base, deliveryTerm: "CPT", destination: "SKOPIE" }, PARTIES, "invoice") as Record<string, any>;
    expect(inv.termsOfDelivery).toBe("CPT SKOPIE");
  });
  it("CASE H: legacy без deliveryTerm → fallback (не се чупи, §22)", () => {
    const inv = buildDocumentData({ ...base, deliveryTerm: null }, PARTIES, "invoice") as Record<string, any>;
    expect(inv.termsOfDelivery).toContain("FCA");
  });
});

describe("CASE G: CMR остава SKOPIE (без CPT текст, §11)", () => {
  it("CMR Epson destination не съдържа CPT", () => {
    const cmr = buildDocumentData({ ...base, deliveryTerm: "CPT", destination: "SKOPIE" }, PARTIES, "cmr_epson") as Record<string, any>;
    expect(cmr.destination).toBe("SKOPIE");
    expect(JSON.stringify(cmr)).not.toContain("CPT");
  });
});
