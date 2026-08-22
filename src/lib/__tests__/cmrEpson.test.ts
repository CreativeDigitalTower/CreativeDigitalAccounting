import { describe, it, expect } from "vitest";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const SRC: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-12T00:00:00.000Z", shipmentDate: "2026-08-12T00:00:00.000Z",
  destination: "Skopie", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II/A-LL 42,5 R", customsCode: "25232900",
  quantity: 26.04, unit: "t", declarationCmrDate: null, dispatchNumber: "9617",
};
const PARTIES: Parties = {
  seller: { name: "Метал Трейд Кюстендил 2005 ЕООД", city: "Кюстендил", country: "България" },
  buyer: { name: "Сем Интернационал ДООЕЛ", city: "Тетово", country: "Северна Македония" },
  client: null,
};

describe("CMR Epson — autofill (§7-§13)", () => {
  const cmr = buildDocumentData(SRC, PARTIES, "cmr_epson") as Record<string, any>;
  it("layout = epson", () => { expect(cmr.layout).toBe("epson"); });
  it("sender/consignee = английската версия", () => {
    expect(cmr.sender.name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
    expect(cmr.consignee.name).toBe("SEM INTERNATIONAL DOOEL");
  });
  it("invoice number е string с водещи нули (§9)", () => {
    expect(cmr.invoiceNumber).toBe("0000009617");
    expect(typeof cmr.invoiceNumber).toBe("string");
  });
  it("truck + trailer се композират SK501TO / SK5022AE (§11)", () => {
    expect(cmr.truck).toBe("SK501TO / SK5022AE");
  });
  it("митн. код от продукта (§13)", () => { expect(cmr.goods.customsCode).toBe("25232900"); });
  it("количество се пази като число (3 знака при рендер)", () => { expect(cmr.quantity).toBe(26.04); });
  it("CMR датата = shipment date (§10)", () => { expect(cmr.date).toBe("2026-08-12T00:00:00.000Z"); });
  it("issue date отделно за годината на фактурата", () => { expect(cmr.invoiceDate).toBe("2026-08-12T00:00:00.000Z"); });
  it("destinationCountry + placeBottom попълнени", () => {
    expect(cmr.destinationCountry).toBe("NORTH MACEDONIA");
    expect(cmr.placeBottom).toBe("KYUSTENDIL");
  });
});

describe("CMR HP — непроменен (§1/§23)", () => {
  it("cmr_hp има layout hp и НЕ ползва Epson overlay полетата", () => {
    const hp = buildDocumentData(SRC, PARTIES, "cmr_hp") as Record<string, any>;
    expect(hp.layout).toBe("hp");
    expect(hp.sender.name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
  });
});
