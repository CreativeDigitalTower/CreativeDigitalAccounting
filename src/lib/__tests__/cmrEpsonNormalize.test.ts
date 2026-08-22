import { describe, it, expect } from "vitest";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";

const SRC: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-12T00:00:00.000Z", shipmentDate: "2026-08-12T00:00:00.000Z",
  destination: "Скопие / FCA СКОПИЕ", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900",
  quantity: 26.04, unit: "t", declarationCmrDate: null, dispatchNumber: "9617",
};
const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INIERNAIIONAL JOUEL", city: "TETOVO, NORTH MACEDONIA", country: "North Macedonia" },
  client: null,
};

describe("CMR Epson builder — defaults за нови документи (§2/§3/§17)", () => {
  const cmr = buildDocumentData(SRC, PARTIES, "cmr_epson") as Record<string, any>;
  it("consignee = SEM INTERNATIONAL DOOEL (typo прихванат)", () => {
    expect(cmr.consignee.name).toBe("SEM INTERNATIONAL DOOEL");
    expect(cmr.consignee.city).toBe("Tetovo");
  });
  it("destination = SKOPIE + NORTH MACEDONIA", () => {
    expect(cmr.destination).toBe("SKOPIE");
    expect(cmr.destinationCountry).toBe("NORTH MACEDONIA");
  });
  it("speditor default = ENIGMA", () => { expect(cmr.speditor).toBe("ENIGMA"); });
  it("описанието включва Holcim (§7/§13)", () => { expect(cmr.goods.description).toContain("Holcim"); });
  it("invoice номер string + shipment/issue дати", () => {
    expect(cmr.invoiceNumber).toBe("0000009617");
    expect(cmr.date).toBe("2026-08-12T00:00:00.000Z");
    expect(cmr.invoiceDate).toBe("2026-08-12T00:00:00.000Z");
  });
});

describe("resolveInvoiceParty — typo варианти (§1)", () => {
  it("SEM INIERNAIIONAL JOUEL → SEM INTERNATIONAL DOOEL", () => {
    expect(resolveInvoiceParty({ name: "SEM INIERNAIIONAL JOUEL" }).name).toBe("SEM INTERNATIONAL DOOEL");
    expect(resolveInvoiceParty({ name: "SEM INTERNATIONAL JOUEL" }).name).toBe("SEM INTERNATIONAL DOOEL");
  });
  it("непозната фирма непроменена", () => {
    expect(resolveInvoiceParty({ name: "Друга Фирма" }).name).toBe("Друга Фирма");
  });
});

describe("CMR HP — незасегнат (§23)", () => {
  it("HP не форсира SKOPIE/ENIGMA", () => {
    const hp = buildDocumentData(SRC, PARTIES, "cmr_hp") as Record<string, any>;
    expect(hp.layout).toBe("hp");
    expect(hp.destination).toBe("Скопие / FCA СКОПИЕ");
    expect(hp.speditor).toBeNull();
  });
});
