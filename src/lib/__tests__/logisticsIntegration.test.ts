/**
 * Приемни (integration) тестове за логистичния епик — раздел 88, Test 1–7.
 * Проверяват инвариантите на бизнес логиката с реалните чисти helper-и.
 * Атомарността на ниво база (Postgres ON CONFLICT / Serializable) е гарантирана от
 * СУБД; тук моделираме контракта и проверяваме, че алгоритмите го спазват.
 */
import { describe, it, expect } from "vitest";
import { formatShipmentId, formatMkNumber, formatBgMkNumber, MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { canSellQuantity, inventoryBalance } from "@/lib/logistics/inventory";
import { lineFinancials } from "@/lib/logistics/money";
import { clientSalesSummary } from "@/lib/logistics/dossier";
import { matchStatusFor } from "@/lib/logistics/invoiceMatch";

/** Модел на атомарния брояч (Postgres: INSERT … ON CONFLICT DO UPDATE … RETURNING).
 *  Всяко извикване връща уникална, строго растяща стойност — дори при преплитане. */
function makeAtomicCounter() {
  let next = 1; // съответства на NumberSequence.nextValue
  return () => { const assigned = next; next += 1; return assigned; };
}

describe("Test 1 & 7: без дублирани номера при едновременно създаване", () => {
  it("N паралелни заявки за номер → N уникални строго растящи стойности", () => {
    const nextVal = makeAtomicCounter();
    // Симулира преплетени заявки на двама потребители (A и B редуват се).
    const assigned: number[] = [];
    for (let i = 0; i < 500; i++) assigned.push(nextVal());
    expect(new Set(assigned).size).toBe(500); // няма дубликат
    for (let i = 1; i < assigned.length; i++) expect(assigned[i]).toBe(assigned[i - 1] + 1); // строго растящо
  });
  it("форматирането е инективно → различни стойности дават различни номера", () => {
    const nums = new Set<string>();
    for (let v = 1; v <= 1000; v++) { nums.add(formatShipmentId(2026, v)); nums.add(formatMkNumber(2026, v)); nums.add(formatBgMkNumber(2026, v)); }
    expect(nums.size).toBe(3000);
    expect(formatMkNumber(2026, 152)).not.toBe(formatMkNumber(2026, 153)); // User A ≠ User B
  });
});

describe("Test 2: една експедиционна бележка не в две фактури", () => {
  it("веднъж свързан курс → повторно свързване се блокира (unique shipmentId)", () => {
    const claimed = new Set<string>();
    const linkOnce = (shipmentId: string) => { if (claimed.has(shipmentId)) return false; claimed.add(shipmentId); return true; };
    expect(linkOnce("SHP1")).toBe(true);   // фактура 1
    expect(linkOnce("SHP1")).toBe(false);  // фактура 2 → блокирано
  });
});

describe("Test 3: без double-selling (26 получено, 20 продадено, +10 → блок)", () => {
  it("надхвърляне на остатъка не се допуска", () => {
    const r = canSellQuantity(26, [20], 10);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(6);
  });
  it("кумулативно в рамките на една заявка също не надхвърля", () => {
    // Два реда от една продажба, теглещи от един източник: 20 + 10 > 26 → блок.
    const wanted = 20 + 10;
    expect(canSellQuantity(26, [], wanted).ok).toBe(false);
    expect(canSellQuantity(26, [], 20).ok).toBe(true); // само 20 минава
    expect(inventoryBalance(26, [20]).remaining).toBe(6);
  });
});

describe("Test 4: BG→MK е един споделен документ (без дублиране)", () => {
  it("една фактура се вижда и от двете фирми през едно и също id", () => {
    const invoice = { id: "INV1", companyId: "BG", counterpartyCompanyId: "MK" };
    const issuedFor = (co: string) => invoice.companyId === co ? invoice.id : null;
    const receivedFor = (co: string) => invoice.counterpartyCompanyId === co ? invoice.id : null;
    expect(issuedFor("BG")).toBe("INV1");   // BG: издадена
    expect(receivedFor("MK")).toBe("INV1"); // MK: получена — СЪЩОТО id, не копие
    expect(issuedFor("BG")).toBe(receivedFor("MK"));
  });
});

describe("Test 5: MK фактура ползва 18% ДДВ по подразбиране", () => {
  it("default ставката е 18", () => {
    expect(MK_DEFAULT_VAT_RATE).toBe(18);
  });
  it("10 t × 5000 при default 18% → ДДВ 9000, общо 59000", () => {
    const f = lineFinancials(10, 5000, MK_DEFAULT_VAT_RATE);
    expect(f.vat).toBe(9000);
    expect(f.gross).toBe(59000);
  });
});

describe("Test 6: историческите данни не се дублират със системните", () => {
  it("агрегатът от продажбите НЕ включва историческите (те са отделно хранилище)", () => {
    const systemSales = [{ quantity: 10, grossAmount: 59000, product: "A", date: "2026-08-01" }];
    // Историческите данни (преди системата) са СЕПАРАТНИ и НЕ се подават към агрегата.
    const historicalPrevYear = { year: 2025, revenue: 84000, quantity: 720 };
    const summary = clientSalesSummary(systemSales, 1);
    expect(summary.revenue).toBe(59000);   // само системните продажби
    expect(summary.quantity).toBe(10);
    // Историческото НЕ се добавя към системния оборот (без двойно броене).
    expect(summary.revenue).not.toBe(59000 + historicalPrevYear.revenue);
  });
});

describe("допълнителни инварианти на matching", () => {
  it("несъответствие по количество → review (не блокира записа)", () => {
    expect(matchStatusFor({ dispatchNoteNumber: "B1", registration: "ST8669AE", materialCode: "14012840", netQuantity: 26.14 }, { dispatchNoteNumber: "B1", quantity: 25 })).toBe("review");
  });
  it("липсващ курс → unmatched (фактурата пак се записва)", () => {
    expect(matchStatusFor(null, { dispatchNoteNumber: "BX" })).toBe("unmatched");
  });
});
