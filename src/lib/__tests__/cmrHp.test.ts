import { describe, it, expect } from "vitest";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const SRC: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-12T00:00:00.000Z", shipmentDate: "2026-08-12T00:00:00.000Z",
  destination: "Скопие / FCA СКОПИЕ", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900",
  quantity: 26.04, unit: "t", declarationCmrDate: null, dispatchNumber: "9617",
};
const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INIERNAIIONAL JOUEL", city: "Tetovo", country: "North Macedonia" },
  client: null,
};

describe("CMR HP — autofill/defaults (§5-§19)", () => {
  const hp = buildDocumentData(SRC, PARTIES, "cmr_hp") as Record<string, any>;
  it("layout = hp (собствена координатна карта, §21)", () => { expect(hp.layout).toBe("hp"); });
  it("consignee = SEM INTERNATIONAL DOOEL (§6, typo прихванат)", () => {
    expect(hp.consignee.name).toBe("SEM INTERNATIONAL DOOEL");
    expect(hp.consignee.city).toBe("Tetovo");
  });
  it("destination = SKOPIE + NORTH MACEDONIA (§7)", () => {
    expect(hp.destination).toBe("SKOPIE");
    expect(hp.destinationCountry).toBe("NORTH MACEDONIA");
  });
  it("speditor default = ENIGMA (§8)", () => { expect(hp.speditor).toBe("ENIGMA"); });
  it("invoice number string + leading zeros (§11)", () => {
    expect(hp.invoiceNumber).toBe("0000009617");
    expect(typeof hp.invoiceNumber).toBe("string");
  });
  it("truck/trailer от snapshot (§10/§19)", () => { expect(hp.truck).toBe("SK501TO / SK5022AE"); });
  it("customs code от продукта (§14)", () => { expect(hp.goods.customsCode).toBe("25232900"); });
  it("описание с Holcim (§12)", () => { expect(hp.goods.description).toContain("Holcim"); });
  it("CMR дата = shipment date; issue date отделно (§9)", () => {
    expect(hp.date).toBe("2026-08-12T00:00:00.000Z");
    expect(hp.invoiceDate).toBe("2026-08-12T00:00:00.000Z");
  });
  it("bottom place = KYUSTENDIL (§18)", () => { expect(hp.placeBottom).toBe("KYUSTENDIL"); });
});
