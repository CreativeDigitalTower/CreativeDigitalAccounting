import { describe, it, expect } from "vitest";
import { formatBgMkNumber } from "@/lib/logistics/config";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";

describe("formatBgMkNumber", () => {
  it("BM-YYYY-000001", () => {
    expect(formatBgMkNumber(2026, 1)).toBe("BM-2026-000001");
    expect(formatBgMkNumber(2026, 152)).toBe("BM-2026-000152");
  });
});

describe("BG→MK продажна позиция (decimal, ДДВ 18%)", () => {
  it("26.14 t × 80 EUR → нето 2091.20, ДДВ 18% 376.42, общо 2467.62", () => {
    const f = lineFinancials(26.14, 80, 18);
    expect(f.net).toBe(2091.2);
    expect(f.vat).toBe(376.42);
    expect(f.gross).toBe(2467.62);
  });
  it("сборът на няколко позиции е точен (decimal)", () => {
    const lines = [lineFinancials(26.14, 80, 18), lineFinancials(23.8, 78, 18)];
    expect(sumMoney(lines.map((l) => l.net))).toBe(3947.6); // 2091.20 + 1856.40
  });
});
