import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildPayableSummary } from "@/lib/logistics/holcimPayable";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("Provisional payment — KPI формули (§3/§4/§5/§11/§19)", () => {
  it("provisional obligation влиза в Total Obligations", () => {
    const [eur] = buildPayableSummary([], [{ purchaseCurrency: "EUR", purchaseAmount: 1745.01, paid: false }]);
    expect(eur.totalObligations).toBe(1745.01);
  });
  it("ПЛАТЕНА provisional влиза в Paid и НЕ в Remaining; остава в Uninvoiced", () => {
    const [eur] = buildPayableSummary([], [{ purchaseCurrency: "EUR", purchaseAmount: 1745.01, paid: true }]);
    expect(eur.paid).toBe(1745.01);
    expect(eur.remaining).toBe(0);
    expect(eur.uninvoiced).toBe(1745.01); // нефактурирано ≠ неплатено
  });
  it("НЕПЛАТЕНА provisional влиза в Remaining", () => {
    const [eur] = buildPayableSummary([], [{ purchaseCurrency: "EUR", purchaseAmount: 1000, paid: false }]);
    expect(eur.remaining).toBe(1000);
  });
  it("смесено: фактура + платена и неплатена provisional → коректни тотали, без double counting", () => {
    const [eur] = buildPayableSummary(
      [{ currency: "EUR", total: 2000, paid: 500 }],
      [{ purchaseCurrency: "EUR", purchaseAmount: 1745.01, paid: true }, { purchaseCurrency: "EUR", purchaseAmount: 1000, paid: false }],
    );
    expect(eur.totalObligations).toBe(4745.01); // 2000 + 1745.01 + 1000
    expect(eur.paid).toBe(2245.01);             // 500 + 1745.01
    expect(eur.remaining).toBe(2500);           // 4745.01 − 2245.01
    expect(eur.uninvoiced).toBe(2745.01);       // 1745.01 + 1000 (платени или не)
  });
  it("§3 production пример: 0 фактури, 64282.10 нефактурирани → Total = 64282.10", () => {
    const [eur] = buildPayableSummary([], [{ purchaseCurrency: "EUR", purchaseAmount: 64282.10, paid: false }]);
    expect(eur.totalObligations).toBe(64282.10);
    expect(eur.uninvoiced).toBe(64282.10);
    expect(eur.remaining).toBe(64282.10);
  });
  it("§17 валути не се смесват при provisional", () => {
    const sum = buildPayableSummary([], [
      { purchaseCurrency: "EUR", purchaseAmount: 1000, paid: true },
      { purchaseCurrency: "BGN", purchaseAmount: 500, paid: false },
    ]);
    expect(sum.find((s) => s.currency === "EUR")!.paid).toBe(1000);
    expect(sum.find((s) => s.currency === "BGN")!.remaining).toBe(500);
  });
});

describe("mark-paid endpoint — security/correctness (§6/§8/§13/§14/§15)", () => {
  const api = read("src/app/api/logistics/holcim-payables/mark-paid/route.ts");
  it("финансов write → manage_invoices; company-scoped (IDOR)", () => {
    expect(api).toContain('logisticsApiGuard("manage_invoices")');
    expect(api).toContain("companyId: g.companyId");
  });
  it("сумите НЕ идват от браузъра — четат се snapshot-ите от DB (§15)", () => {
    expect(api).toContain("tx.exportDocumentSet.findMany");
    expect(api).not.toContain("body.amount");
  });
  it("само НЕсвързани доставки (без фактура) — свързаните минават през invoice payments (§10)", () => {
    expect(api).toContain("supplierInvoiceLinks: { none: {} }");
  });
  it("транзакция + idempotent (само реално променящите се редове)", () => {
    expect(api).toContain("prisma.$transaction");
    expect(api).toContain("(s.purchasePaidAt != null) !== paid");
  });
  it("audit на всяка промяна paid↔unpaid (§13)", () => {
    expect(api).toContain('audit(g.companyId, g.userId, paid ? "mark_paid" : "mark_unpaid"');
  });
  it("няма Payment запис за provisional → без double counting (§6)", () => {
    expect(api).not.toContain("prisma.payment.create");
  });
});

describe("схема + summary + breakdown source (§18/§2/§11)", () => {
  it("purchasePaidAt/ById са additive/nullable на ExportDocumentSet", () => {
    const s = read("prisma/schema.prisma");
    expect(s).toMatch(/purchasePaidAt\s+DateTime\?/);
    expect(s).toMatch(/purchasePaidById\s+String\?/);
  });
  it("summary подава paid флаг (purchasePaidAt != null)", () => {
    const s = read("src/app/api/logistics/holcim-payables/route.ts");
    expect(s).toContain("paid: d.purchasePaidAt != null");
  });
  it("breakdown: default sort invoice DESC + paid флаг на реда + uninvoiced без оглед на paid", () => {
    const s = read("src/app/api/logistics/holcim-payables/uninvoiced/route.ts");
    expect(s).toContain('{ invoiceNumber: "desc" }'); // default invoice
    expect(s).toContain("paid: d.purchasePaidAt != null");
    // критерият за uninvoiced НЕ включва paid статус (§11).
    expect(s).toContain("purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} }");
    expect(s).not.toContain("purchasePaidAt: null }");
  });
});
