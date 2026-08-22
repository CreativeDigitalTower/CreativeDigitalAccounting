import { describe, it, expect } from "vitest";
import { buildDocumentData, invoiceTotals, goodsRowValue, displayUnitTNE, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";
import { resolveInvoiceParty } from "@/lib/logistics/invoiceParties";

const SRC: ExportSetSource = {
  invoiceNumber: "9654", invoiceDate: "2026-08-20T00:00:00.000Z",
  destination: "SKOPJE", truckRegSnapshot: "ST1344AD", trailerReg: null,
  productSnapshot: "CEM II/A-LL 42,5 R", quantity: 26, unit: "t", declarationCmrDate: null, dispatchNumber: "9654",
};
const PARTIES: Parties = {
  seller: { name: "Метал Трейд Кюстендил 2005 ЕООД", city: "Кюстендил", manager: "ПЕЙО ЧУНЧЕВ" },
  buyer: { name: "Сем Интернационал ДООЕЛ", city: "Тетово", country: "Северна Македония" },
  client: { name: "SEM INTERNATIONAL DOOEL" },
};

describe("resolveInvoiceParty — английска фирмена версия (§5/§6)", () => {
  it("продавачът → METAL TRADE KUSTENDIL 2005 Ltd.", () => {
    expect(resolveInvoiceParty({ name: "МЕТАЛ ТРЕЙД КЮСТЕНДИЛ 2005 ЕООД" })).toMatchObject({
      name: "METAL TRADE KUSTENDIL 2005 Ltd.", address: "23 Kaloyan Str.", city: "Kyustendil", country: "Bulgaria",
    });
    expect(resolveInvoiceParty({ name: "Metal Trade Kustendil 2005 Ltd." }).name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
  });
  it("купувачът → SEM INTERNATIONAL DOOEL", () => {
    expect(resolveInvoiceParty({ name: "Сем Интернационал ДООЕЛ" })).toMatchObject({
      name: "SEM INTERNATIONAL DOOEL", address: "55 Marshal Tito Str.", city: "Tetovo", country: "North Macedonia",
    });
  });
  it("непозната фирма остава непроменена", () => {
    const o = { name: "Друга Фирма ЕООД", city: "София" };
    expect(resolveInvoiceParty(o)).toEqual(o);
  });
});

describe("displayUnitTNE (§14)", () => {
  it("t/T/ton/tonne/тон → TNE; празно → TNE", () => {
    for (const u of ["t", "T", "ton", "tonne", "тон", "", null]) expect(displayUnitTNE(u)).toBe("TNE");
  });
  it("друга единица → uppercase", () => { expect(displayUnitTNE("bag")).toBe("BAG"); });
});

describe("invoiceTotals / goodsRowValue — Decimal-safe (§19/§28)", () => {
  it("line value = qty × price", () => {
    expect(goodsRowValue({ quantity: 26.36, unitPrice: 100 })).toBeCloseTo(2636, 2);
    expect(goodsRowValue({ value: 2600 })).toBe(2600);
  });
  it("сумира количество (3 знака) и стойност (2 знака) без float грешки", () => {
    const t = invoiceTotals([
      { quantity: 26.36, unitPrice: 100 },
      { quantity: 23.8, unitPrice: 105 },
      { quantity: 23.8, unitPrice: 110 },
    ]);
    expect(t.quantity).toBe(73.96);
    expect(t.value).toBe(7753);
  });
});

describe("buildDocumentData — фактура autofill (§1/§16) без #REF!", () => {
  const inv = buildDocumentData(SRC, PARTIES, "invoice") as Record<string, any>;
  it("seller/buyer са английската версия", () => {
    expect(inv.seller.name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
    expect(inv.buyer.name).toBe("SEM INTERNATIONAL DOOEL");
  });
  it("goods е масив с първи ред от продукта", () => {
    expect(Array.isArray(inv.goods)).toBe(true);
    expect(inv.goods[0].quantity).toBe(26);
    expect(inv.goods[0].unit).toBe("TNE");
  });
  it("декларацията, VAT текстът и представителят са попълнени; няма #REF!", () => {
    expect(inv.originText).toContain("ИЗНОСИТЕЛЯТ НА ПРОДУКТИТЕ");
    expect(inv.vatText).toBe("Export, Art.28 Bulgarian VAT Legislation");
    expect(inv.manager).toBe("ПЕЙО ЧУНЧЕВ");
    expect(JSON.stringify(inv)).not.toContain("#REF!");
  });
});

import { isSemInternational } from "@/lib/logistics/semName";

describe("isSemInternational — разпознаване на грешните варианти (§6)", () => {
  it("хваща typo вариантите", () => {
    for (const n of ["SEM INIERNAIIONAL JOUEL", "SEM INERNAIONAL JOUEL", "SEM INTERNATIONAL JOUEL", "SEM INTERNACIONAL DOOEL", "Сем Интернационал ДООЕЛ", "SEM INTERNATIONAL DOOEL"]) {
      expect(isSemInternational(n)).toBe(true);
    }
  });
  it("не хваща други фирми", () => {
    expect(isSemInternational("METAL TRADE KUSTENDIL 2005 Ltd.")).toBe(false);
    expect(isSemInternational("Друга Фирма ЕООД")).toBe(false);
    expect(isSemInternational(null)).toBe(false);
  });
});

describe("Фактура — invoice number string + две дати (§1-4)", () => {
  const two = buildDocumentData(
    { ...SRC, invoiceNumber: "0000009654", invoiceDate: "2026-08-20T00:00:00.000Z", shipmentDate: "2026-08-22T00:00:00.000Z" },
    PARTIES, "invoice",
  ) as Record<string, any>;
  it("invoiceNumber се пази като string с водещи нули", () => {
    expect(two.invoiceNumber).toBe("0000009654");
    expect(typeof two.invoiceNumber).toBe("string");
  });
  it("issue date и shipment date са различни полета", () => {
    expect(two.invoiceDate).toBe("2026-08-20T00:00:00.000Z");
    expect(two.dateOfShipment).toBe("2026-08-22T00:00:00.000Z");
    expect(two.invoiceDate).not.toBe(two.dateOfShipment);
  });
  it("legacy без shipmentDate → dateOfShipment fallback към issue date", () => {
    const legacy = buildDocumentData({ ...SRC, shipmentDate: null }, PARTIES, "invoice") as Record<string, any>;
    expect(legacy.dateOfShipment).toBe(legacy.invoiceDate);
  });
});
