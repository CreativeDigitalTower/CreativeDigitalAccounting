import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { computePurchaseAmount, invoiceRemaining, paymentStatus, wouldOverpay, buildPayableSummary } from "@/lib/logistics/holcimPayable";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("holcimPayable — калкулация (§B/§Q)", () => {
  it("1/2) 26.080 × 66.91 = 1745.01 (decimal, 2 знака)", () => {
    // Бел.: спецификацията посочи 1744.81, но реалната сметка е 26.08 × 66.91 = 1745.0128 → 1745.01.
    expect(computePurchaseAmount(26.080, 66.91)).toBe(1745.01);
  });
  it("3) decimal correctness — без float drift", () => {
    expect(computePurchaseAmount(25, 70)).toBe(1750);
    expect(computePurchaseAmount(26.12, 64.36)).toBe(1681.08);
  });
  it("7) липсваща цена/количество → null (не 0)", () => {
    expect(computePurchaseAmount(26, null)).toBeNull();
    expect(computePurchaseAmount(null, 66.91)).toBeNull();
  });
});

describe("payment status / remaining / overpay (§H/§Q)", () => {
  it("15) неплатена", () => { expect(paymentStatus(1000, 0)).toBe("unpaid"); });
  it("13) частично платена", () => { expect(paymentStatus(1000, 400)).toBe("partially_paid"); expect(invoiceRemaining(1000, 400)).toBe(600); });
  it("14) платена (пълно)", () => { expect(paymentStatus(1000, 1000)).toBe("paid"); expect(invoiceRemaining(1000, 1000)).toBe(0); });
  it("remaining не пада под 0", () => { expect(invoiceRemaining(1000, 1200)).toBe(0); });
  it("16) overpayment се разпознава (блокира се освен при изрично разрешение)", () => {
    expect(wouldOverpay(1000, 600, 500)).toBe(true);
    expect(wouldOverpay(1000, 600, 400)).toBe(false);
  });
  it("total 0 → paid (нищо не се дължи)", () => { expect(paymentStatus(0, 0)).toBe("paid"); });
});

describe("payable summary — double counting + валути (§F/§Q10/§Q11/§Q18)", () => {
  it("10/11) само НЕсвързани доставки се броят като нефактурирани (без double counting)", () => {
    // 1 фактура 1744.81 (линкната доставка не влиза в uninvoiced); 1 несвързана доставка 1000.
    const sum = buildPayableSummary(
      [{ currency: "EUR", total: 1744.81, paid: 0 }],
      [{ purchaseCurrency: "EUR", purchaseAmount: 1000 }], // несвързана
    );
    const eur = sum.find((s) => s.currency === "EUR")!;
    // Grand total = фактура (1744.81) + нефактурирано (1000) без double counting.
    expect(eur.totalObligations).toBe(2744.81);
    expect(eur.uninvoiced).toBe(1000);      // нефактурирано (отделно subset)
    expect(eur.remaining).toBe(2744.81);    // нищо платено
    // Свързаната доставка не влиза пак → не 1744.81+1744.81.
    expect(eur.totalObligations).not.toBe(3489.62);
  });
  it("18) различни валути не се сумират в едно", () => {
    const sum = buildPayableSummary(
      [{ currency: "EUR", total: 1000, paid: 200 }, { currency: "BGN", total: 500, paid: 0 }],
      [],
    );
    const eur = sum.find((s) => s.currency === "EUR")!;
    const bgn = sum.find((s) => s.currency === "BGN")!;
    expect(eur.totalObligations).toBe(1000); expect(eur.paid).toBe(200); expect(eur.remaining).toBe(800);
    expect(bgn.totalObligations).toBe(500); expect(bgn.remaining).toBe(500);
    expect(sum).toHaveLength(2);
  });
});

describe("source: snapshot capture + security (§C/§M/§P)", () => {
  const create = read("src/app/api/logistics/export-sets/route.ts");
  const edit = read("src/app/api/logistics/export-sets/[id]/route.ts");
  const schema = read("prisma/schema.prisma");

  it("3/5) create снапшотва purchaseUnitPrice/currency/amount (override ИЛИ от продукта)", () => {
    expect(create).toContain("const purchaseUnitPrice = d.purchaseUnitPrice != null ? d.purchaseUnitPrice");
    expect(create).toContain("Number(product.purchasePrice)");
    expect(create).toContain("purchaseUnitPrice, purchaseCurrency, purchaseAmount,");
  });
  it("4) edit пресмята amount при промяна, БЕЗ да чете master (стари доставки не се влияят)", () => {
    expect(edit).toContain("data.purchaseAmount = computePurchaseAmount(qty, price)");
    expect(edit).not.toContain("logisticsProduct.findFirst({ where: { id: d.logisticsProductId, companyId: g.companyId }, select: { canonicalName: true, certificateNumber: true, purchasePrice");
  });
  it("§C) snapshot полетата са additive/nullable Decimal в схемата", () => {
    expect(schema).toMatch(/purchaseUnitPrice\s+Decimal\?\s+@db\.Decimal\(12, 4\)/);
    expect(schema).toMatch(/purchaseAmount\s+Decimal\?\s+@db\.Decimal\(14, 4\)/);
    expect(schema).toContain("model SupplierInvoiceExportLink");
    expect(schema).toMatch(/@@unique\(\[invoiceId, exportSetId\]\)/);
  });
  it("8/9/§P) payments + links са зад manage_invoices и company-scoped (IDOR)", () => {
    const pay = read("src/app/api/logistics/supplier-invoices/[id]/payments/route.ts");
    const links = read("src/app/api/logistics/supplier-invoices/[id]/links/route.ts");
    expect(pay).toContain('logisticsApiGuard("manage_invoices")');
    expect(pay).toContain("findFirst({\n    where: { id, companyId }");
    expect(links).toContain('logisticsApiGuard("manage_invoices")');
    expect(links).toContain("companyId: g.companyId, deletedAt: null"); // доставката е на активната фирма
  });
  it("§F) summary брои само доставки БЕЗ свързана фактура (supplierInvoiceLinks none)", () => {
    const sumApi = read("src/app/api/logistics/holcim-payables/route.ts");
    expect(sumApi).toContain("supplierInvoiceLinks: { none: {} }");
    expect(sumApi).toContain("purchaseAmount: { not: null }");
  });
  it("§P) payments/links read остава view, write остава manage (разделени права)", () => {
    const pay = read("src/app/api/logistics/supplier-invoices/[id]/payments/route.ts");
    expect(pay).toContain('logisticsApiGuard("view_logistics")'); // GET
  });
});

describe("reconciliation script (§N) — dry-run safe", () => {
  const s = read("scripts/reconcile-export-purchase-cost.mjs");
  it("dry-run по подразбиране; пише само при --apply", () => {
    expect(s).toContain('const APPLY = process.argv.includes("--apply")');
    expect(s).toContain("if (APPLY && resolved)");
  });
  it("не измисля цена — UNRESOLVED без доказуема стойност; company-scoped", () => {
    expect(s).toContain("UNRESOLVED");
    expect(s).toContain("--company");
    expect(s).toContain("current-master");
  });
  it("idempotent + само snapshot полетата (не пипа data/документи)", () => {
    expect(s).toContain("purchaseAmount: null }"); // updateMany само ако още няма snapshot
    expect(s).not.toContain("prisma.exportDocument."); // не пипа ExportDocument (документи)
  });
});
