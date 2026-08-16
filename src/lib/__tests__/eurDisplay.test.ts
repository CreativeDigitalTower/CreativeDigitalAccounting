import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DUAL_DISPLAY_END_DATE, isDualCurrencyActive, isDualDisplayForDate, shouldShowDualCurrency,
} from "@/lib/constants";

describe("EUR single-currency display (край на двойното обозначаване 08.08.2026)", () => {
  it("централизирана дата DUAL_DISPLAY_END_DATE = 2026-08-08", () => {
    expect(DUAL_DISPLAY_END_DATE.toISOString().slice(0, 10)).toBe("2026-08-08");
  });

  it("текущият интерфейс/цени са EUR-only (isDualCurrencyActive = false)", () => {
    expect(isDualCurrencyActive()).toBe(false);
  });

  it("исторически документ (издаден преди края) запазва двойното обозначаване", () => {
    expect(isDualDisplayForDate("2026-07-01")).toBe(true);   // стара фактура → показва BGN
    expect(isDualDisplayForDate("2026-08-07")).toBe(true);
  });

  it("нов документ (издаден на/след края) е EUR-only", () => {
    expect(isDualDisplayForDate("2026-08-08")).toBe(false);
    expect(isDualDisplayForDate("2026-08-12")).toBe(false);
    expect(isDualDisplayForDate(null)).toBe(false);
    expect(isDualDisplayForDate("невалидна")).toBe(false);
  });

  it("shouldShowDualCurrency: само EUR + издаден преди края", () => {
    expect(shouldShowDualCurrency("2026-07-01", "EUR")).toBe(true);   // стара EUR фактура
    expect(shouldShowDualCurrency("2026-08-12", "EUR")).toBe(false);  // нова EUR → EUR only
    expect(shouldShowDualCurrency("2026-07-01", "USD")).toBe(false);  // USD → без BGN
    expect(shouldShowDualCurrency("2026-07-01", "GBP")).toBe(false);  // GBP → без BGN
    expect(shouldShowDualCurrency("2026-08-12", "USD")).toBe(false);
  });
});

// ── Автоматизиран guard: предотвратява връщането на автоматично BGN обозначаване
// в текущите user-facing екрани. Историческите рендерери и валутният калкулатор са
// изрично разрешени (issue-date gated / функционален конвертор). ──
describe("guard: няма ново автоматично BGN обозначаване в текущия UI", () => {
  const ROOTS = ["src/app", "src/components"];
  // Файлове с легитимна употреба (исторически документи по дата на издаване + конвертор).
  const ALLOW = new Set([
    "src/components/app/InvoiceDocument.tsx",
    "src/components/app/OfferDocument.tsx",
    "src/app/tools/currency/page.tsx",
    "src/components/tools/Calculators.tsx",
  ]);
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...walk(p));
      else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(p);
    }
    return out;
  }
  const offenders: { file: string; hit: string }[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const rel = file.replace(/\\/g, "/");
      if (ALLOW.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      // toBGN(...) / EUR_TO_BGN / „≈ … лв/BGN" / фиксиран курс 1,95583 = автоматично
      // двойно обозначаване в текущия UI.
      if (/\btoBGN\s*\(/.test(src)) offenders.push({ file: rel, hit: "toBGN(" });
      else if (/\bEUR_TO_BGN\b/.test(src)) offenders.push({ file: rel, hit: "EUR_TO_BGN" });
      else if (/≈[^\n<]{0,60}(лв\b|BGN)/.test(src)) offenders.push({ file: rel, hit: "≈ … лв/BGN" });
      else if (/1[.,]95583/.test(src)) offenders.push({ file: rel, hit: "фиксиран курс 1,95583" });
    }
  }

  it("нито един текущ екран не показва автоматично BGN еквивалент", () => {
    expect(offenders, `Намерено автоматично BGN обозначаване:\n${offenders.map((o) => `  ${o.file} → ${o.hit}`).join("\n")}`).toEqual([]);
  });
});
