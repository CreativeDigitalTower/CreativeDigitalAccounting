import { describe, it, expect } from "vitest";
import { buildDocumentData, kgFromTonnes, invoiceLineValue, truckTrailerLabel, goodsRowValue, invoiceTotals, dispatchTotalQuantity, cmrPrintOffset, shouldRegenerate, DECLARATION_STATEMENT, translateCountry, partyEn, splitTruckTrailer, buildDeclarationText, resolveExportSetRole, type Parties } from "@/lib/logistics/exportDocs";
import { promotePatchToSet } from "@/lib/logistics/promoteFields";
import { toExportParty } from "@/lib/logistics/exportParty";
import { formatSequenceNumber, suggestDispatchFromInvoice, EXPORT_INVOICE_FORMAT, EXPORT_DOC_TYPES, ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";
import { normalizeProductKey } from "@/lib/logistics/normalize";

// Fixture по SK501.xlsx (само за тестове — НЕ seed).
const SRC = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-12T00:00:00.000Z",
  destination: "SKOPIE", truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900",
  quantity: 26.04, unit: "t", declarationCmrDate: "2026-08-12T00:00:00.000Z", dispatchNumber: "9617",
  holcimProforma: null,
};
const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria", eik: "109581515" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Tetovo", country: "North Macedonia", registrationNumber: "MK123" },
  client: { name: "ARADIKO KOP DOOEL", city: "Skopje" },
};

describe("numbering (конфигурируем 10-цифрен формат)", () => {
  it("0000009617", () => {
    expect(formatSequenceNumber(9617, EXPORT_INVOICE_FORMAT)).toBe("0000009617");
    expect(formatSequenceNumber(1, EXPORT_INVOICE_FORMAT)).toBe("0000000001");
  });
  it("dispatch предложение = последните 4 цифри на invoice", () => {
    expect(suggestDispatchFromInvoice("0000009617")).toBe("9617");
    expect(suggestDispatchFromInvoice("")).toBe("");
  });
});

describe("truck/trailer + kg + invoice value", () => {
  it("комбиниран етикет", () => { expect(truckTrailerLabel("SK501TO", "SK5022AE")).toBe("SK501TO / SK5022AE"); });
  it("CMR kg = количество × 1000 (26.04 → 26040)", () => { expect(kgFromTonnes(26.04)).toBe(26040); });
  it("invoice стойност = количество × цена (26.04 × 100 = 2604)", () => { expect(invoiceLineValue(26.04, 100)).toBe(2604); });
});

describe("buildDocumentData — едно въвеждане → всички документи", () => {
  it("генерира и 6-те типа", () => {
    for (const dt of EXPORT_DOC_TYPES) expect(buildDocumentData(SRC, PARTIES, dt)).toBeTruthy();
  });
  it("Invoice: номер/камион/дестинация/продукт от source", () => {
    const inv = buildDocumentData(SRC, PARTIES, "invoice") as Record<string, unknown>;
    expect(inv.invoiceNumber).toBe("0000009617");
    expect(inv.truck).toBe("SK501TO / SK5022AE");
    expect(inv.destination).toBe("SKOPIE");
    expect((inv.seller as { name: string }).name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
    expect((inv.buyer as { name: string }).name).toBe("SEM INTERNATIONAL DOOEL");
    const goods = (inv.goods as { description: string; quantity: number }[])[0];
    expect(goods.description).toContain("CEM II A-LL 42.5 R");
    expect(goods.quantity).toBe(26.04);
    expect(inv.vatRate).toBe(0); // Export Art.28
  });
  it("CMR: kg = 26040, invoice номер, камион, customsCode", () => {
    const cmr = buildDocumentData(SRC, PARTIES, "cmr_epson") as Record<string, unknown>;
    expect(cmr.weightKg).toBe(26040);
    expect(cmr.invoiceNumber).toBe("0000009617");
    expect(cmr.truck).toBe("SK501TO / SK5022AE");
    expect((cmr.goods as { customsCode: string }).customsCode).toBe("25232900");
    expect(cmr.layout).toBe("epson");
    expect((buildDocumentData(SRC, PARTIES, "cmr_hp") as Record<string, unknown>).layout).toBe("hp");
  });
  it("Испратница: номер, камион, продукт, количество; издател = MK фирмата", () => {
    const disp = buildDocumentData(SRC, PARTIES, "dispatch") as Record<string, unknown>;
    expect(disp.dispatchNumber).toBe("9617");
    // Издателят на Испратницата се показва на кирилица както в оригинала (§3, resolveDispatchIssuer).
    expect((disp.issuer as { name: string }).name).toBe('"Сем Интернационал" ДООЕЛ');
    expect((disp.recipient as { name: string })?.name).toBe("ARADIKO KOP DOOEL");
    const row = (disp.rows as { truck: string; quantity: number }[])[0];
    expect(row.truck).toBe("SK501TO / SK5022AE");
    expect(row.quantity).toBe(26.04);
  });
  it("Празна: без получател", () => {
    const blank = buildDocumentData(SRC, PARTIES, "blank") as Record<string, unknown>;
    expect(blank.recipient).toBe(null);
  });
  it("Декларация: invoice номер + компания auto-fill", () => {
    const decl = buildDocumentData(SRC, PARTIES, "declaration") as Record<string, unknown>;
    expect(decl.invoiceNumber).toBe("0000009617");
    expect((decl.bgCompany as { name: string }).name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
  });
});

describe("сумиране на invoice/dispatch таблици (PR2)", () => {
  it("goodsRowValue ползва явната стойност, ако е зададена", () => {
    expect(goodsRowValue({ quantity: 26.04, unitPrice: 100, value: 2600 })).toBe(2600);
  });
  it("goodsRowValue смята количество × цена, ако няма явна стойност", () => {
    expect(goodsRowValue({ quantity: 26.04, unitPrice: 100 })).toBe(2604);
  });
  it("invoiceTotals събира количество (3 знака) и стойност (2 знака) без плаваща грешка", () => {
    const r = invoiceTotals([
      { quantity: 26.04, unitPrice: 100 },
      { quantity: 10.1, unitPrice: 99.9 },
    ]);
    expect(r.quantity).toBe(36.14);
    expect(r.value).toBe(3612.99);
  });
  it("dispatchTotalQuantity събира количествата decimal-safe", () => {
    expect(dispatchTotalQuantity([{ quantity: 0.1 }, { quantity: 0.2 }])).toBe(0.3);
  });
});

describe("Декларация + CMR (PR3)", () => {
  it("декларацията носи фактурата, продукта и произход BG и EU", () => {
    const dec = buildDocumentData(SRC, PARTIES, "declaration");
    expect(dec.invoiceNumber).toBe("0000009617");
    expect(dec.product).toBe("CEM II A-LL 42.5 R");
    expect(dec.origin).toBe("BG и EU");
    expect(String(dec.bodyText)).toContain("0000009617");
  });
  it("CMR Epson и HP носят различен layout, но еднакво бруто тегло (kg)", () => {
    const ep = buildDocumentData(SRC, PARTIES, "cmr_epson");
    const hp = buildDocumentData(SRC, PARTIES, "cmr_hp");
    expect(ep.layout).toBe("epson");
    expect(hp.layout).toBe("hp");
    expect(ep.weightKg).toBe(26040);
    expect(hp.weightKg).toBe(26040);
    expect((ep.goods as { customsCode?: string }).customsCode).toBe("25232900");
  });
  it("cmrPrintOffset разделя калибрирането на двата принтера", () => {
    expect(cmrPrintOffset("epson")).toEqual({ top: 0, left: 0 });
    expect(cmrPrintOffset("hp")).toEqual({ top: 6, left: 4 });
    expect(cmrPrintOffset(null)).toEqual({ top: 0, left: 0 });
  });
});

describe("BUGFIX/UX — активни документи, декларация, регенерация, persistence", () => {
  it("активният workflow е точно 5 документа, без blank", () => {
    expect(ACTIVE_EXPORT_DOC_TYPES.length).toBe(5);
    expect((ACTIVE_EXPORT_DOC_TYPES as readonly string[]).includes("blank")).toBe(false);
    expect(isActiveExportDocType("blank")).toBe(false);
    expect(isActiveExportDocType("invoice")).toBe(true);
    // blank остава в историческия набор за backward compatibility
    expect((EXPORT_DOC_TYPES as readonly string[]).includes("blank")).toBe(true);
  });

  it("декларацията съдържа задължителния нормативен текст", () => {
    const dec = buildDocumentData(SRC, PARTIES, "declaration");
    expect(dec.statementText).toBe(DECLARATION_STATEMENT);
    for (const frag of ["Кумулация не е приложена", "при поискване от митническите власти", "допълнителни документи"]) {
      expect(String(dec.statementText)).toContain(frag);
    }
  });

  it("shouldRegenerate: нов→true, draft→true, overridden→само при force, finalized→никога", () => {
    expect(shouldRegenerate(null, false)).toBe(true);
    expect(shouldRegenerate({ status: "draft", overridden: false }, false)).toBe(true);
    expect(shouldRegenerate({ status: "draft", overridden: true }, false)).toBe(false);
    expect(shouldRegenerate({ status: "draft", overridden: true }, true)).toBe(true);
    expect(shouldRegenerate({ status: "finalized", overridden: false }, false)).toBe(false);
    expect(shouldRegenerate({ status: "finalized", overridden: true }, true)).toBe(false); // дори с force
  });

  it("persistence: ръчна корекция преживява опит за „Генерирай всички“", () => {
    // 1) generate → авто-данни
    const auto = buildDocumentData(SRC, PARTIES, "invoice") as { goods: { quantity: number; unitPrice: number | null }[] };
    expect(auto.goods[0].quantity).toBe(26.04);
    // 2) потребителят коригира количество/цена → overridden snapshot
    const overriddenDoc = { status: "draft", overridden: true, data: { ...auto, goods: [{ ...auto.goods[0], quantity: 25.5, unitPrice: 100 }] } };
    // 3) „Генерирай всички" без force → трябва да се пропусне (не презаписва)
    expect(shouldRegenerate(overriddenDoc, false)).toBe(false);
    // 4) повторно отваряне връща запазените ръчни стойности (snapshot, не regenerate)
    expect(overriddenDoc.data.goods[0].quantity).toBe(25.5);
    expect(invoiceTotals(overriddenDoc.data.goods).value).toBe(2550);
  });
});

describe("DOCUMENT SYNC — English snapshot, promote-to-source, декларация, MK visibility", () => {
  const SELLER_EN = {
    name: "Метал Трейд Кюстендил 2005 ООД", address: "ул. Калоян 23", city: "Кюстендил", country: "България",
    eik: "109581515", registrationNumber: null, vatNumber: "BG109581515",
    nameEn: "METAL TRADE KUSTENDIL 2005 Ltd.", addressEn: "23 Kaloyan Str.", cityEn: "Kyustendil", countryEn: "Bulgaria",
    manager: "ПЕЙО ЧУНЧЕВ",
  };
  const BUYER_EN = {
    name: "SEM INTERNATIONAL DOOEL", address: null, city: "Тетово", country: "Северна Македония",
    eik: null, registrationNumber: "MK123", vatNumber: null, countryEn: "North Macedonia",
  };
  const P: Parties = { seller: SELLER_EN, buyer: BUYER_EN, client: { name: "ARADIKO KOP DOOEL", city: "Skopje" } };

  it("#3 Invoice seller показва English legal name", () => {
    const inv = buildDocumentData(SRC, P, "invoice") as { seller: { name: string; address: string; city: string; country: string } };
    expect(inv.seller.name).toBe("METAL TRADE KUSTENDIL 2005 Ltd.");
    expect(inv.seller.address).toBe("23 Kaloyan Str.");
    expect(inv.seller.city).toBe("Kyustendil");
    expect(inv.seller.country).toBe("Bulgaria");
  });
  it("#4 Buyer = SEM INTERNATIONAL DOOEL", () => {
    const inv = buildDocumentData(SRC, P, "invoice") as { buyer: { name: string } };
    expect(inv.buyer.name).toBe("SEM INTERNATIONAL DOOEL");
  });
  it("#5 Terms по подразбиране = FCA KYUSTENDIL (един интервал)", () => {
    const inv = buildDocumentData(SRC, P, "invoice") as { termsOfDelivery: string };
    expect(inv.termsOfDelivery).toBe("FCA KYUSTENDIL");
  });
  it("#6 Country display = North Macedonia (translateCountry)", () => {
    expect(translateCountry("Северна Македония")).toBe("North Macedonia");
    const inv = buildDocumentData(SRC, P, "invoice") as { destinationCountry: string };
    expect(inv.destinationCountry).toBe("North Macedonia");
  });
  it("#7 Invoice има date/city/manager блок", () => {
    const inv = buildDocumentData(SRC, P, "invoice") as { date: string; city: string; manager: string };
    expect(inv.date).toBe(SRC.invoiceDate);
    expect(inv.city).toBe("KYUSTENDIL");
    expect(inv.manager).toBe("ПЕЙО ЧУНЧЕВ");
  });
  it("partyEn прави fallback към BG стойности, ако липсва English", () => {
    expect(partyEn({ name: "Фирма", city: "София" }).city).toBe("София");
    expect(partyEn({ name: "Фирма", nameEn: "Firm Ltd." }).name).toBe("Firm Ltd.");
  });
  it("toExportParty мапва Company → Party (mol → manager, En полета)", () => {
    const p = toExportParty({ name: "X", address: null, city: "Кюстендил", country: "България", eik: "1", registrationNumber: null, vatNumber: null, mol: "Иван", nameEn: "X Ltd." });
    expect(p.manager).toBe("Иван"); expect(p.nameEn).toBe("X Ltd.");
  });

  it("#1 splitTruckTrailer разделя комбинирания етикет (промяна на камиона)", () => {
    expect(splitTruckTrailer("SK6539 / SK6539AO")).toEqual({ truck: "SK6539", trailer: "SK6539AO" });
    expect(splitTruckTrailer("SK501TO")).toEqual({ truck: "SK501TO", trailer: null });
    expect(splitTruckTrailer("")).toEqual({ truck: null, trailer: null });
  });
  it("#8 promotePatchToSet мапва truck → truckRegSnapshot/trailerReg и invoiceNumber", () => {
    const upd = promotePatchToSet({ truck: "SK6539 / SK6539AO", invoiceNumber: " 0000009617 " });
    expect(upd.truckRegSnapshot).toBe("SK6539"); expect(upd.trailerReg).toBe("SK6539AO");
    expect(upd.invoiceNumber).toBe("0000009617");
  });
  it("#9 downstream Dispatch ползва новия камион след като set-ът е обновен", () => {
    const src2 = { ...SRC, truckRegSnapshot: "SK6539", trailerReg: "SK6539AO" };
    const disp = buildDocumentData(src2, P, "dispatch") as { rows: { truck: string }[] };
    expect(disp.rows[0].truck).toBe("SK6539 / SK6539AO");
  });
  it("#10/#11 shouldRegenerate: overridden не се пипа без force, finalized никога", () => {
    expect(shouldRegenerate({ status: "draft", overridden: true }, false)).toBe(false);
    expect(shouldRegenerate({ status: "finalized", overridden: false }, true)).toBe(false);
  });

  it("#12 декларацията се съставя от proforma/invoice променливи и се обновява при промяна", () => {
    const base = buildDeclarationText({ declarantName: "Пейо Димитров Чунчев", representedCompany: "Метал Трейд – Кюстендил 2005 ООД", proformaSupplier: "ХОЛСИМ (БЪЛГАРИЯ) АД", invoiceNumber: "0000009617", invoiceDate: "2026-08-12" });
    expect(base).toContain("Пейо Димитров Чунчев");
    expect(base).toContain("ХОЛСИМ (БЪЛГАРИЯ) АД");
    expect(base).toContain("0000009617");
    // промяна на proforma → нов текст
    const withProf = buildDeclarationText({ invoiceNumber: "0000009617", proformaNumber: "3285959", proformaDate: "2026-08-11" });
    expect(withProf).toContain("Проформа Фактура 3285959");
    expect(withProf).toContain("11.08.2026");
    // промяна на invoice номер → нов текст
    expect(buildDeclarationText({ invoiceNumber: "0000009999" })).toContain("0000009999");
  });
  it("#13 CMR invoice number идва от source; sync през promote", () => {
    const cmr = buildDocumentData({ ...SRC, invoiceNumber: "0000009999" }, P, "cmr_epson") as { invoiceNumber: string };
    expect(cmr.invoiceNumber).toBe("0000009999");
  });
  it("#14 Declaration city = КЮСТЕНДИЛ (от град на продавача, не София)", () => {
    const dec = buildDocumentData(SRC, P, "declaration") as { city: string; place: string };
    expect(dec.city).toBe("КЮСТЕНДИЛ");
    expect(dec.place).toBe("КЮСТЕНДИЛ");
  });

  it("#16/#17 resolveExportSetRole: продавач/купувач виждат, чужда фирма — не", () => {
    const set = { companyId: "BG", buyerCompanyId: "MK" };
    expect(resolveExportSetRole("BG", set, false)).toBe("seller");
    expect(resolveExportSetRole("MK", set, true)).toBe("buyer");   // MK в същата група
    expect(resolveExportSetRole("MK", set, false)).toBe(null);     // MK не в групата
    expect(resolveExportSetRole("OTHER", set, true)).toBe(null);   // чужда фирма
  });

  it("#19 CMR Epson/HP: идентично съдържание, различен само layout offset (RETAINED)", () => {
    const ep = buildDocumentData(SRC, P, "cmr_epson") as Record<string, unknown>;
    const hp = buildDocumentData(SRC, P, "cmr_hp") as Record<string, unknown>;
    expect(ep.layout).toBe("epson"); expect(hp.layout).toBe("hp");
    // съдържанието (без layout) е еднакво
    const { layout: _a, ...epRest } = ep; const { layout: _b, ...hpRest } = hp;
    expect(JSON.stringify(epRest)).toBe(JSON.stringify(hpRest));
    // разликата е само в печатния offset
    expect(cmrPrintOffset("epson")).not.toEqual(cmrPrintOffset("hp"));
  });
});

describe("product alias нормализация (кирилско А, запетая, /)", () => {
  it("кирилско А-LL 52,5 N дава същия ключ като латинско A-LL 52.5 N", () => {
    expect(normalizeProductKey("CEM II / А-LL 52,5 N")).toBe(normalizeProductKey("CEM II A-LL 52.5 N"));
  });
  it("не смесва A-LL / B-LL", () => {
    expect(normalizeProductKey("CEM II А-LL 42,5 R")).not.toBe(normalizeProductKey("CEM II B-LL 42.5 R"));
  });
});
