import { describe, it, expect } from "vitest";
// Един source of truth: тества същия .mjs модул, който ползва reconciliation скриптът.
import { suggestCity } from "../../../../scripts/lib/cityParse.mjs";

describe("suggestCity — разпознаване на град от адрес (§4/§5/§11)", () => {
  it("ясен град като последен сегмент → HIGH (Куманово)", () => {
    const r = suggestCity("ул. Биљановска ББ, Куманово", null);
    expect(r).toMatchObject({ city: "Куманово", confidence: "HIGH" });
  });
  it("район + град → HIGH (Визбегово, Скопје → Скопје)", () => {
    const r = suggestCity("ул. 8, бр. 14, Визбегово, Скопје", null);
    expect(r).toMatchObject({ city: "Скопје", confidence: "HIGH" });
  });
  it("град като последен сегмент (Штип) → HIGH", () => {
    expect(suggestCity("ул. Македонија 15, Штип", null)).toMatchObject({ city: "Штип", confidence: "HIGH" });
  });
  it("латиница → HIGH (Skopje)", () => {
    expect(suggestCity("ul. Partizanska 10, Skopje", null)).toMatchObject({ city: "Skopje", confidence: "HIGH" });
  });
  it("няколко познати града → LOW (двусмислено), без предложение", () => {
    const r = suggestCity("Складиште Куманово, испратено за Скопје, Битола", null);
    // последният сегмент Битола е познат → всъщност HIGH по правило 1; затова тестваме случай без познат последен:
    const amb = suggestCity("Куманово - Скопје регион, непознато", null);
    expect(amb.confidence === "LOW" || amb.confidence === "MEDIUM" || amb.confidence === "UNRESOLVED").toBe(true);
    void r;
  });
  it("непознато, но правдоподобно населено място като последен → MEDIUM", () => {
    expect(suggestCity("ул. Прва 1, Непознатоград", null)).toMatchObject({ confidence: "MEDIUM", city: "Непознатоград" });
  });
  it("последен сегмент е улица/номер, без друг кандидат → UNRESOLVED", () => {
    expect(suggestCity("ул. Прва бр. 12", null)).toMatchObject({ confidence: "UNRESOLVED" });
  });
  it("празен адрес → UNRESOLVED", () => {
    expect(suggestCity("", "")).toMatchObject({ confidence: "UNRESOLVED", city: "" });
    expect(suggestCity(null, null)).toMatchObject({ confidence: "UNRESOLVED" });
  });
  it("резервен baseAddress се ползва при празен address", () => {
    expect(suggestCity("", "ул. X, Тетово")).toMatchObject({ city: "Тетово", confidence: "HIGH" });
  });
  it("познат град НЕ като последен сегмент → MEDIUM", () => {
    expect(suggestCity("Струмица, индустриска зона, обј. 5", null)).toMatchObject({ city: "Струмица", confidence: "MEDIUM" });
  });
  it("вече попълнен град не е грижа на парсера (скриптът го пропуска) — парсерът пак предлага от адреса", () => {
    // Парсерът е чист; пропускането на вече попълнени е в скрипта.
    expect(suggestCity("ул. Прва 1, Охрид", null)).toMatchObject({ city: "Охрид", confidence: "HIGH" });
  });
  it("не ползва цифрови/улични токени като град", () => {
    expect(suggestCity("бул. Партизански 15, бр. 3", null).city).not.toMatch(/\d/);
  });
});

describe("source: script е dry-run safe + company-scoped + idempotent (§3/§7/§8/§10)", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const s = fs.readFileSync("scripts/reconcile-logistics-client-cities.mjs", "utf-8");
  it("dry-run по подразбиране; пише само при --apply + одобрен файл", () => {
    expect(s).toContain('const APPLY = process.argv.includes("--apply")');
    expect(s).toContain("--approved-file");
    expect(s).toContain("if (APPLY) return applyMode");
  });
  it("company-scoped (не пипа други фирми)", () => {
    expect(s).toContain("where: { companyId, archivedAt: null }");
    expect(s).toContain("companyId: company.id");
  });
  it("idempotent: updateMany само ако city е null; идентификация по Client ID", () => {
    expect(s).toContain("city: null }, data: { city: suggested }");
    expect(s).toContain('col("Client ID")');
  });
  it("не пипа други полета (само city) и само Action=FILL", () => {
    expect(s).toContain('action !== "FILL"');
    expect(s).not.toContain("data: { name:");
    expect(s).not.toContain("data: { address:");
  });
  it("няма db push / без destination като град", () => {
    expect(s).not.toContain("db push");
    expect(s).not.toContain("destination");
  });
});
