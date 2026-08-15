import { describe, it, expect } from "vitest";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { invoiceTotals } from "@/lib/logistics/purchaseCalc";
import { matchInvoiceLine, resolveProductByMaterialCode, matchStatusFor } from "@/lib/logistics/invoiceMatch";
import { HOLCIM_INVOICE_FIXTURE as FIX } from "@/lib/logistics/__fixtures__/holcimInvoice";

describe("decimal-safe line financials", () => {
  it("Test 5: 26.140 × 70.00 → 1829.80 (нето)", () => {
    expect(lineFinancials(26.14, 70, 20).net).toBe(1829.8);
  });
  it("Test 6: 20% ДДС върху 1829.80 → 365.96; бруто 2195.76", () => {
    const f = lineFinancials(26.14, 70, 20);
    expect(f.vat).toBe(365.96);
    expect(f.gross).toBe(2195.76);
  });
  it("всеки ред от реалната фактура дава точните net/vat/gross", () => {
    for (const l of FIX.lines) {
      const f = lineFinancials(l.quantity, l.unitPrice, FIX.vatRate);
      expect(f.net).toBe(l.net);
      expect(f.vat).toBe(l.vat);
      expect(f.gross).toBe(l.gross);
    }
  });
});

describe("Test 7: сумата от шестте реда = header тоталите", () => {
  it("10 492.05 / 2 098.41 / 12 590.46", () => {
    const totals = invoiceTotals(FIX.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })), FIX.vatRate);
    expect(totals.base).toBe(FIX.headerTaxBase);   // 10492.05
    expect(totals.vat).toBe(FIX.headerVatTotal);   // 2098.41
    expect(totals.total).toBe(FIX.headerGrandTotal); // 12590.46
  });
  it("sumMoney не трупа float грешка", () => {
    expect(sumMoney(FIX.lines.map((l) => l.net))).toBe(10492.05);
  });
});

describe("Shipment matching (primary = dispatch note)", () => {
  const shipment = { dispatchNoteNumber: "B0000313802", registration: "ST8669AE", materialCode: "14012840", netQuantity: 26.14 };

  it("Test 1: пълно съвпадение → без предупреждения", () => {
    const r = matchInvoiceLine(shipment, { dispatchNoteNumber: "B0000313802", truck: "ST 8669 AE", materialCode: "14012840", quantity: 26.14 });
    expect(r.primaryMatch).toBe(true);
    expect(r.hasWarning).toBe(false);
  });
  it("Test 2: различен автомобил → warning (но primary пак съвпада)", () => {
    const r = matchInvoiceLine(shipment, { dispatchNoteNumber: "B0000313802", truck: "CB1234AB", quantity: 26.14 });
    expect(r.primaryMatch).toBe(true);
    expect(r.warnings.truck).toBe(true);
    expect(r.hasWarning).toBe(true);
  });
  it("Test 3: различно количество → warning", () => {
    const r = matchInvoiceLine(shipment, { dispatchNoteNumber: "B0000313802", quantity: 25.0 });
    expect(r.warnings.quantity).toBe(true);
  });
  it("различен материал → warning", () => {
    const r = matchInvoiceLine(shipment, { dispatchNoteNumber: "B0000313802", materialCode: "14008014" });
    expect(r.warnings.material).toBe(true);
  });
  it("нормализиран автомобил (интервали/малки букви) не дава фалшив warning", () => {
    const r = matchInvoiceLine(shipment, { truck: "st 8669 ae" });
    expect(r.warnings.truck).toBe(false);
  });
});

describe("matchStatusFor (ръчен ред — matching не блокира записа)", () => {
  const shipment = { dispatchNoteNumber: "B0000313802", registration: "ST8669AE", materialCode: "14012840", netQuantity: 26.14 };

  it("няма намерен курс → unmatched (не блокира)", () => {
    expect(matchStatusFor(null, { dispatchNoteNumber: "B0000313802", quantity: 26.14 })).toBe("unmatched");
  });
  it("намерен курс, всичко съвпада → matched", () => {
    expect(matchStatusFor(shipment, { dispatchNoteNumber: "B0000313802", truck: "ST8669AE", materialCode: "14012840", quantity: 26.14 })).toBe("matched");
  });
  it("намерен курс, но различно количество → review", () => {
    expect(matchStatusFor(shipment, { dispatchNoteNumber: "B0000313802", quantity: 30 })).toBe("review");
  });
  it("намерен курс, но различен автомобил → review", () => {
    expect(matchStatusFor(shipment, { dispatchNoteNumber: "B0000313802", truck: "CB1234AB" })).toBe("review");
  });
});

describe("Test 8/9: разпознаване на продукт по material code", () => {
  const products = [
    { id: "p1", materialCode: "14012840" },
    { id: "p2", materialCode: "14008014" },
  ];
  it("познат material code → връща продукта", () => {
    expect(resolveProductByMaterialCode("14012840", products)).toBe("p1");
    expect(resolveProductByMaterialCode("140-080-14", products)).toBe("p2"); // нормализира
  });
  it("непознат material code → null (изисква ревю, не се създава автоматично)", () => {
    expect(resolveProductByMaterialCode("14007073", products)).toBe(null);
    expect(resolveProductByMaterialCode(null, products)).toBe(null);
  });
});
