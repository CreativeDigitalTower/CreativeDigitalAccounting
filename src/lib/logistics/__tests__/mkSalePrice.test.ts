import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const single = read("src/app/api/logistics/export-sets/received/[id]/invoice-prefill/route.ts");
const bulk = read("src/app/api/logistics/export-sets/received/bulk-prefill/route.ts");
const form = read("src/app/(app)/dashboard/documents/new/page.tsx");
const apiList = read("src/app/api/logistics/products/route.ts");
const apiPatch = read("src/app/api/logistics/products/[id]/route.ts");
const schema = read("prisma/schema.prisma");
const modal = read("src/components/app/logistics/ProductEditModal.tsx");
const list = read("src/components/app/logistics/LogisticsProducts.tsx");

describe("DB + API (§2/§7/§11)", () => {
  it("salePriceMk е additive/nullable Decimal на LogisticsProduct (отделно от purchasePrice)", () => {
    expect(schema).toMatch(/salePriceMk\s+Decimal\?\s+@db\.Decimal\(12, 4\)/);
    // не пипа purchasePrice
    expect(schema).toMatch(/purchasePrice\s+Decimal\?\s+@db\.Decimal\(12, 4\)/);
  });
  it("products API приема и сериализира salePriceMk (create + patch)", () => {
    expect(apiList).toContain("salePriceMk: z.number().min(0).nullable().optional()");
    expect(apiList).toContain("salePriceMk: d.salePriceMk ?? null");
    expect(apiList).toContain("salePriceMk: salePriceMk == null ? null : Number(salePriceMk)");
    expect(apiPatch).toContain("if (d.salePriceMk !== undefined) data.salePriceMk = d.salePriceMk");
  });
});

describe("Products UI (§2/§12)", () => {
  it("edit модал + create форма + таблица колона за MK продажна цена", () => {
    expect(modal).toContain("logistics.products.salePriceMk");
    expect(list).toContain("logistics.products.salePriceMkCol");
    expect(list).toContain("salePriceLabel");
    expect(list).toContain("logistics.products.salePriceMkNone"); // „Не е зададена"
  });
});

describe("Single prefill (§3/§6/§9)", () => {
  it("unitPrice = salePriceMk, само в MKD фактура; иначе null (ръчно)", () => {
    expect(single).toContain("set.logisticsProductId");
    expect(single).toContain('currency === "MKD" && prod?.salePriceMk != null ? Number(prod.salePriceMk) : null');
    expect(single).toContain("vatRate: MK_DEFAULT_VAT_RATE, unitPrice }");
  });
  it("company-scoped product lookup (§10)", () => {
    expect(single).toContain("findFirst({ where: { id: set.logisticsProductId, companyId: g.companyId }");
  });
});

describe("Bulk prefill (§5/§9)", () => {
  it("всеки ред получава цената на своя продукт (batch), MKD-gated", () => {
    expect(bulk).toContain("logisticsProduct.findMany({ where: { id: { in: prodIds }, companyId: g.companyId }");
    expect(bulk).toContain("unitPrice: unitPriceFor(s.logisticsProductId)");
    expect(bulk).toContain('currency === "MKD" && pid && saleBySet.get(pid) != null');
  });
});

describe("Форма: prefill попълва цената, остава редактируема (§3/§6)", () => {
  it("single + bulk ползват върнатия unitPrice (fallback 0 за ръчно)", () => {
    expect(form).toContain("unitPrice: d.line.unitPrice ?? 0");
    expect(form).toContain("unitPrice: l.unitPrice ?? 0");
  });
});

describe("Разделяне на цените + историческа безопасност (§7/§8)", () => {
  it("salePriceMk НЕ презаписва purchasePrice/purchaseCurrency (отделни полета)", () => {
    expect(apiPatch).toContain("if (d.purchasePrice !== undefined) data.purchasePrice = d.purchasePrice");
    expect(apiPatch).toContain("if (d.salePriceMk !== undefined) data.salePriceMk = d.salePriceMk");
  });
  it("prefill НЕ ползва purchasePrice като продажна цена (§6)", () => {
    expect(single).not.toContain("purchasePrice");
    expect(bulk).not.toContain("purchasePrice");
  });
  it("няма hardcode на фирма/цена", () => {
    for (const s of [single, bulk]) { expect(s).not.toContain("SEM INTERNATIONAL"); expect(s).not.toContain("4500"); }
  });
});
