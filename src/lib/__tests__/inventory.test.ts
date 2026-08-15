import { describe, it, expect } from "vitest";
import { inventoryBalance, canSellQuantity } from "@/lib/logistics/inventory";
import { formatMkNumber } from "@/lib/logistics/config";
import { lineFinancials } from "@/lib/logistics/money";

describe("inventoryBalance (получено/продадено/остатък)", () => {
  it("получено 50, продадено 20 → остатък 30", () => {
    const b = inventoryBalance(50, [20]);
    expect(b.received).toBe(50);
    expect(b.sold).toBe(20);
    expect(b.remaining).toBe(30);
  });
  it("няколко приспадания се сумират", () => {
    expect(inventoryBalance(50, [10, 8, 8.14]).remaining).toBe(23.86);
  });
});

describe("canSellQuantity (без double-selling — раздел 34, Test 3)", () => {
  it("Test 3: получено 26, продадено 20, опит за още 10 → блокирано", () => {
    const r = canSellQuantity(26, [20], 10);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(6);
    expect(r.remainingAfter).toBe(-4);
  });
  it("в рамките на остатъка → ok", () => {
    const r = canSellQuantity(26, [20], 6);
    expect(r.ok).toBe(true);
    expect(r.remainingAfter).toBe(0);
  });
  it("нулево/отрицателно количество → не ok", () => {
    expect(canSellQuantity(26, [], 0).ok).toBe(false);
    expect(canSellQuantity(26, [], -5).ok).toBe(false);
  });
});

describe("MK фактура номер + продажна позиция (MKD, ДДВ 18%)", () => {
  it("MK-YYYY-000001", () => {
    expect(formatMkNumber(2026, 1)).toBe("MK-2026-000001");
    expect(formatMkNumber(2026, 153)).toBe("MK-2026-000153");
  });
  it("10 t × 5000 MKD, ДДВ 18% → нето 50000, ДДВ 9000, общо 59000", () => {
    const f = lineFinancials(10, 5000, 18);
    expect(f.net).toBe(50000);
    expect(f.vat).toBe(9000);
    expect(f.gross).toBe(59000);
  });
});
