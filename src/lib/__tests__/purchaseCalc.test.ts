import { describe, it, expect } from "vitest";
import { lineTotal, invoiceTotals, proformaBalance, canAllocate } from "@/lib/logistics/purchaseCalc";

describe("lineTotal", () => {
  it("реалният пример 26.140 × 70 = 1829.80", () => {
    expect(lineTotal(26.14, 70)).toBe(1829.8);
  });
  it("нулеви/отрицателни → 0", () => {
    expect(lineTotal(-1, 70)).toBe(0);
    expect(lineTotal(10, -5)).toBe(0);
  });
});

describe("invoiceTotals (ДДС не е hardcode)", () => {
  it("сумира редовете и прилага подадената ставка", () => {
    const r = invoiceTotals([{ quantity: 26.14, unitPrice: 70 }, { quantity: 23.8, unitPrice: 70 }], 20);
    expect(r.base).toBe(3495.8); // 1829.80 + 1666.00
    expect(r.vat).toBe(699.16);
    expect(r.total).toBe(4194.96);
  });
  it("различна ставка (напр. 0) — без ДДС", () => {
    const r = invoiceTotals([{ quantity: 10, unitPrice: 50 }], 0);
    expect(r.base).toBe(500);
    expect(r.vat).toBe(0);
    expect(r.total).toBe(500);
  });
  it("липсваща ставка → третира се като 0 (не 20)", () => {
    expect(invoiceTotals([{ quantity: 10, unitPrice: 50 }], null).vat).toBe(0);
  });
});

describe("proformaBalance", () => {
  it("остатък = договорено − Σ приспаднати (300 − 26.04 − 26.12 − 25.52 − 27.14)", () => {
    const b = proformaBalance(300, [26.04, 26.12, 25.52, 27.14]);
    expect(b.used).toBe(104.82);
    expect(b.remaining).toBe(195.18);
    expect(b.negative).toBe(false);
  });
  it("отрицателен остатък се маркира", () => {
    const b = proformaBalance(50, [30, 25]);
    expect(b.remaining).toBe(-5);
    expect(b.negative).toBe(true);
  });
});

describe("canAllocate (без overselling без потвърждение)", () => {
  it("в рамките на остатъка → ok", () => {
    const r = canAllocate(300, [100], 50);
    expect(r.ok).toBe(true);
    expect(r.remainingAfter).toBe(150);
  });
  it("надхвърляне → не ok (изисква override)", () => {
    const r = canAllocate(100, [80], 30);
    expect(r.ok).toBe(false);
    expect(r.remainingAfter).toBe(-10);
  });
  it("точно до нула → ok", () => {
    expect(canAllocate(100, [70], 30).ok).toBe(true);
  });
});
