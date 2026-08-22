import { describe, it, expect } from "vitest";
import { destinationEn, invoiceDeliveryTerms, isDeliveryTerm, PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

describe("deliveryTerms — Incoterm НЕ определя дестинацията (§4)", () => {
  it("PLACE_OF_SHIPMENT_DEFAULT = BELI IZVOR", () => { expect(PLACE_OF_SHIPMENT_DEFAULT).toBe("BELI IZVOR"); });
  it("destinationEn: Скопие → SKOPIE; Бели Извор → BELI IZVOR (без Враца)", () => {
    expect(destinationEn("Скопие")).toBe("SKOPIE");
    expect(destinationEn("Бели Извор")).toBe("BELI IZVOR");
  });
  it("invoiceDeliveryTerms = {term} {destination} (§9)", () => {
    expect(invoiceDeliveryTerms("FCA", "SKOPIE", "legacy")).toBe("FCA SKOPIE");
    expect(invoiceDeliveryTerms("CPT", "TETOVO", "legacy")).toBe("CPT TETOVO");
    expect(invoiceDeliveryTerms(null, "X", "FCA KYUSTENDIL")).toBe("FCA KYUSTENDIL");
    expect(isDeliveryTerm("XX")).toBe(false);
  });
});

const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "София", country: "Bulgaria" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Tetovo", country: "North Macedonia" },
  client: null,
};
const base: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-22T00:00:00.000Z", shipmentDate: null,
  placeOfShipment: "BELI IZVOR", destination: "SKOPIE", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900", quantity: 26.04, unit: "t",
  declarationCmrDate: null, dispatchNumber: "9617",
};

describe("Invoice mapping (§21) — CASE FCA", () => {
  const inv = buildDocumentData({ ...base, deliveryTerm: "FCA", destination: "SKOPIE" }, PARTIES, "invoice") as Record<string, any>;
  it("Terms of delivery = FCA SKOPIE (не FCA Vratsa)", () => {
    expect(inv.termsOfDelivery).toBe("FCA SKOPIE");
    expect(JSON.stringify(inv)).not.toContain("VRATSA");
    expect(JSON.stringify(inv)).not.toContain("Враца");
  });
  it("Place of shipment = BELI IZVOR (не СОФИЯ, §3/§10)", () => {
    // Рендираните полета (placeOfShipment/originPlace) не са СОФИЯ; „city" е vestigial и не се показва.
    expect(inv.placeOfShipment).toBe("BELI IZVOR");
    expect(inv.placeOfShipment).not.toBe("СОФИЯ");
    expect(inv.originPlace).not.toBe("СОФИЯ");
  });
  it("Destination = SKOPIE (отделно поле, §5)", () => { expect(inv.destination).toBe("SKOPIE"); });
  it("Declaration place = СЪЩИЯТ source (BELI IZVOR, §11/§12); дата = issue date (§13)", () => {
    expect(inv.originPlace).toBe("BELI IZVOR");
    expect(inv.originPlace).toBe(inv.placeOfShipment);
    expect(inv.date).toBe("2026-08-22T00:00:00.000Z");
  });
});

describe("Invoice mapping — CASE CPT (§22)", () => {
  const inv = buildDocumentData({ ...base, deliveryTerm: "CPT", destination: "TETOVO", placeOfShipment: "BELI IZVOR" }, PARTIES, "invoice") as Record<string, any>;
  it("CPT TETOVO / BELI IZVOR / TETOVO", () => {
    expect(inv.termsOfDelivery).toBe("CPT TETOVO");
    expect(inv.placeOfShipment).toBe("BELI IZVOR");
    expect(inv.destination).toBe("TETOVO");
  });
});

describe("placeOfShipment default когато липсва (§10/§15)", () => {
  it("без placeOfShipment → BELI IZVOR (не seller.city)", () => {
    const inv = buildDocumentData({ ...base, placeOfShipment: null, deliveryTerm: "FCA" }, PARTIES, "invoice") as Record<string, any>;
    expect(inv.placeOfShipment).toBe("BELI IZVOR");
    expect(inv.originPlace).toBe("BELI IZVOR");
  });
});

describe("CMR остава по шаблона (§16), без regression", () => {
  it("CMR Epson destination = SKOPIE, без CPT/BELI IZVOR в destination поле", () => {
    const cmr = buildDocumentData({ ...base, deliveryTerm: "CPT", destination: "TETOVO" }, PARTIES, "cmr_epson") as Record<string, any>;
    expect(cmr.destination).toBe("SKOPIE");
    expect(JSON.stringify(cmr)).not.toContain("CPT");
  });
});

import { MK_DESTINATIONS, mergeDestinations, normalizeDestination } from "@/lib/logistics/deliveryTerms";

describe("Destination combobox — canonical list + dedupe (§4/§6/§18)", () => {
  it("началните canonical дестинации включват основните MK градове", () => {
    for (const c of ["SKOPIE", "PETROVEC", "GOSTIVAR", "KUMANOVO", "STRUMICA", "VINICA", "TETOVO", "KRIVA PALANKA", "SHTIP", "LIPKOVO", "KOCHANI"]) {
      expect(MK_DESTINATIONS).toContain(c);
    }
  });
  it("dedupe: Skopje / SKOPIE / Skopie / Скопие → една опция (§6)", () => {
    const merged = mergeDestinations(["Skopje", "SKOPIE", "Skopie", "Скопие"]);
    expect(merged.length).toBe(1);
    expect(merged[0]).toBe("SKOPIE");
  });
  it("нормализиран ключ е еднакъв за вариантите", () => {
    expect(normalizeDestination("Скопие")).toBe(normalizeDestination("SKOPIE"));
    expect(normalizeDestination("Tetovo")).toBe(normalizeDestination("TETOVO"));
  });
  it("обогатяване от routes/export sets без дубли; нова стойност се добавя", () => {
    const merged = mergeDestinations(MK_DESTINATIONS, ["SKOPIE"], ["OHRID"]);
    expect(merged.filter((d) => d === "SKOPIE").length).toBe(1);
    expect(merged).toContain("OHRID");
  });
  it("празни/невалидни се игнорират", () => {
    expect(mergeDestinations(["", "  ", null, undefined])).toEqual([]);
  });
});
