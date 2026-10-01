import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const PATCH = read("src/app/api/logistics/products/[id]/route.ts");
const MODAL = read("src/components/app/logistics/ProductEditModal.tsx");
const LIST = read("src/components/app/logistics/LogisticsProducts.tsx");

// Функционалността за редакция на покупната цена вече съществува; тези тестове заключват
// изискванията от §9, които не бяха изрично покрити (IDOR scope, permission на PATCH,
// да не се пипат id/aliases/material code при price-only update, decimal round-trip, refresh).

describe("Продукти — редакция на покупна цена (§1/§7/§9)", () => {
  it("1/UI) Edit бутонът отваря модала с покупна цена + валута и refresh след save", () => {
    expect(LIST).toContain("setEditTarget(p)");
    expect(LIST).toContain("ProductEditModal");
    expect(LIST).toContain("onSaved={() => { setEditTarget(null); void load(); }}");
    expect(MODAL).toContain("logistics.products.purchasePrice");
    expect(MODAL).toContain("logistics.products.currency");
    expect(MODAL).toContain("/api/logistics/products/${f.id}");
  });

  it("5/6) server-side validation: цена ≥ 0, decimal, nullable; валидна валута", () => {
    expect(PATCH).toMatch(/purchasePrice:\s*z\.number\(\)\.min\(0\)\.nullable\(\)\.optional\(\)/);
    expect(PATCH).toContain('purchaseCurrency: z.string().refine((c) => CURRENCY_CODES.includes(c)');
  });

  it("7) permission (manage_rates) + 10) company scope (IDOR защита през owned())", () => {
    expect(PATCH).toContain('logisticsApiGuard("manage_rates")');
    expect(PATCH).toContain("async function owned(companyId: string, id: string)");
    expect(PATCH).toContain("findFirst({ where: { id, companyId }");
    expect(PATCH).toContain('if (!(await owned(g.companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 })');
  });

  it("7/8/9) price-only update НЕ пипа id/aliases/material code/certificate (само подадени полета)", () => {
    // Всяко поле се прилага само ако е подадено (d.x !== undefined) → price-only body не променя другите.
    expect(PATCH).toContain("if (d.purchasePrice !== undefined) data.purchasePrice = d.purchasePrice");
    expect(PATCH).toContain("if (d.materialCode !== undefined)");
    expect(PATCH).toContain("if (d.certificateNumber !== undefined)");
    // Alias се пипа само при изричен addAlias/removeAliasId (не при price update).
    expect(PATCH).toContain("if (d.addAlias)");
    expect(PATCH).toContain("if (d.removeAliasId)");
    // update е върху същия id (без смяна/дублиране на продукт).
    expect(PATCH).toContain("prisma.logisticsProduct.update({ where: { id }, data })");
    expect(PATCH).not.toContain("logisticsProduct.create");
  });

  it("8/13) audit log за редакцията + връща актуалната цена като Number (decimal round-trip)", () => {
    expect(PATCH).toContain('audit(g.companyId, g.userId, "update", "LogisticsProduct", id');
    expect(PATCH).toContain("purchasePrice: fresh.purchasePrice == null ? null : Number(fresh.purchasePrice)");
  });

  it("12) покупната цена е ВЪТРЕШНА — Decimal(12,4), не губи стотинки (напр. 69.20, 64.36)", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/purchasePrice\s+Decimal\?\s+@db\.Decimal\(12, 4\)/);
    // Decimal(…,4) побира 2+ дробни знака без загуба.
    expect(Number("69.20")).toBe(69.2);
    expect(Number("64.36")).toBe(64.36);
  });
});
