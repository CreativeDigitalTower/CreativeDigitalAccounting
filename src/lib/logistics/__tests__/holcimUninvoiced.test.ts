import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const KPI = read("src/app/api/logistics/holcim-payables/route.ts");
const LIST = read("src/app/api/logistics/holcim-payables/uninvoiced/route.ts");
const UI = read("src/components/app/logistics/LogisticsHolcimInvoices.tsx");

describe("Нефактурирани доставки — разбивка = KPI (§1/§3/§4)", () => {
  it("1/3) разбивката ползва СЪЩИТЕ критерии като KPI (purchaseAmount not null + links none + scope)", () => {
    // KPI dataset
    expect(KPI).toContain("purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} }");
    // breakdown dataset — идентични критерии
    expect(LIST).toContain("companyId: g.companyId, deletedAt: null, purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} }");
  });
  it("2/10) linked доставка (има SupplierInvoiceExportLink) НЕ се появява (none:{})", () => {
    expect(LIST).toContain("supplierInvoiceLinks: { none: {} }");
    expect(LIST).not.toContain("supplierInvoiceLinks: { some:");
  });
  it("4) purchaseAmount идва от SNAPSHOT, не от текущата master цена", () => {
    expect(LIST).toContain("purchaseAmount: d.purchaseAmount == null ? null : Number(d.purchaseAmount)");
    expect(LIST).not.toContain("logisticsProduct");      // не чете продукта
    expect(LIST).not.toContain("purchasePrice");         // не чете master цената
  });
  it("4b) totals са за ЦЕЛИЯ филтриран dataset (не само страницата, §6) и чрез Decimal sumMoney (§12)", () => {
    expect(LIST).toContain("sumMoney([r.amount");
    // totals се смятат върху `all` (пълния filtered set), не върху pageRows.
    expect(LIST).toContain("for (const d of all)");
  });
});

describe("валути / сигурност (§4/§12/§7)", () => {
  it("6) totals по валута, без смесване / без FX", () => {
    expect(LIST).toContain("const cur = d.purchaseCurrency || \"EUR\"");
    expect(LIST).toContain("byCurrency[cur]");
    expect(LIST).not.toMatch(/convert|exchange|fxRate/i);
  });
  it("7) company-scoped (IDOR)", () => {
    expect(LIST).toContain("companyId: g.companyId");
    expect(LIST).toContain('logisticsApiGuard("view_logistics")');
  });
  it("8) изтрити доставки се изключват (deletedAt: null — payable логиката от #235)", () => {
    expect(LIST).toContain("deletedAt: null");
  });
});

describe("search / filter / sort / pagination (§5/§6)", () => {
  it("9) поддържа q/product/currency/year-month/sort + server-side pagination", () => {
    for (const k of ["q", "product", "currency", "sort", "page", "pageSize"]) expect(LIST).toContain(`sp.get("${k}")`);
    expect(LIST).toContain("skip: (page - 1) * pageSize");
    expect(LIST).toContain('{ invoiceDate: "desc" }'); // default най-новите
  });
  it("sort опции: date_asc/invoice/quantity/amount", () => {
    expect(LIST).toContain('sort === "date_asc"');
    expect(LIST).toContain('sort === "invoice"');
    expect(LIST).toContain('sort === "quantity"');
    expect(LIST).toContain('sort === "amount"');
  });
});

describe("UI (§2/§7/§11)", () => {
  it("KPI 'Нефактурирани' е clickable → scroll към таблицата", () => {
    expect(UI).toContain("uninvRef.current?.scrollIntoView");
    expect(UI).toContain("ref={uninvRef}");
  });
  it("разделът ползва новия endpoint и показва footer totals + empty state", () => {
    expect(UI).toContain("/api/logistics/holcim-payables/uninvoiced");
    expect(UI).toContain("logistics.payable.uninvFooter");
    expect(UI).toContain("logistics.payable.uninvEmpty");
    expect(UI).toContain('href={`/dashboard/logistics/export/${r.id}`}'); // „Отвори доставка"
  });
});
