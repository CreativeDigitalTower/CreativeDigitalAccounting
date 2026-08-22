import { describe, it, expect } from "vitest";
import { MK_CLIENTS } from "@/lib/logistics/mkClients.data";
import { normalizeCompanyName } from "@/lib/logistics/normalize";

describe("MK клиенти — dataset (§8)", () => {
  it("точно 19 клиента", () => { expect(MK_CLIENTS.length).toBe(19); });
  it("BEKO TRANS е с null ЕДБ (§4)", () => {
    const beko = MK_CLIENTS.find((c) => c.name.startsWith("BEKO TRANS"));
    expect(beko?.eik).toBeNull();
  });
  it("всички са North Macedonia + имат адрес", () => {
    for (const c of MK_CLIENTS) {
      expect(c.country).toBe("North Macedonia");
      expect(c.address.trim().length).toBeGreaterThan(0);
    }
  });
  it("ЕДБ се пази като string (не BG ЕИК checksum, §10)", () => {
    const dm = MK_CLIENTS.find((c) => c.name.startsWith("ДМ-ПРЕЦИЗ"));
    expect(dm?.eik).toBe("4029998115950");
    expect(typeof dm?.eik).toBe("string");
  });
  it("имената са запазени точно, без транслитерация (§9)", () => {
    // JOВАНОВ = латинско J + O + кирилица; ТРИ БРАЌА с ќ; смесени латиница/кирилица.
    expect(MK_CLIENTS.some((c) => c.name === "JOВАНОВ ТРАНС ДООЕЛ")).toBe(true);
    expect(MK_CLIENTS.some((c) => c.name === "ТРИ БРАЌА ДОО")).toBe(true);
    expect(MK_CLIENTS.some((c) => c.name === "ARADIKO KOP DOOEL")).toBe(true);
  });
  it("уникални ЕДБ (освен null)", () => {
    const eiks = MK_CLIENTS.map((c) => c.eik).filter(Boolean);
    expect(new Set(eiks).size).toBe(eiks.length);
  });
});

describe("normalizeCompanyName — dedupe ключ (§7)", () => {
  it("едно и също име (casing/кирилица) → същия ключ", () => {
    expect(normalizeCompanyName("ДМ-ПРЕЦИЗ ДОО")).toBe(normalizeCompanyName("дм-прециз доо"));
  });
  it("различни фирми → различни ключове", () => {
    expect(normalizeCompanyName("МАК-БЕТ ДОО")).not.toBe(normalizeCompanyName("КАЛИНА ДООЕЛ"));
  });
  it("непразен ключ за всеки от 19-те клиента (стабилен за dedupe)", () => {
    for (const c of MK_CLIENTS) expect(normalizeCompanyName(c.name).length).toBeGreaterThan(0);
  });
});
