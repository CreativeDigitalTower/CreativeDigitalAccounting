import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { getDocMessages, docIntlLocale, isDocLanguage, getMessages } from "@/lib/i18n/messages";
import { DOC_LANGUAGES, getDefaultDocumentLanguage } from "@/lib/constants";
import bgPdf from "@/locales/bg/pdf.json";
import mkPdf from "@/locales/mk/pdf.json";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const keys = (o: unknown, prefix = ""): string[] => {
  if (!o || typeof o !== "object") return [prefix];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
};

describe("getDefaultDocumentLanguage (§3/§4/§16/§17)", () => {
  it("1) MK издател → mk", () => {
    expect(getDefaultDocumentLanguage({ countryCode: "MK" })).toBe("mk");
    expect(getDefaultDocumentLanguage({ countryCode: "mk", defaultLanguage: "en" })).toBe("mk"); // MK печели
  });
  it("2) BG издател → непроменен default (defaultLanguage или bg)", () => {
    expect(getDefaultDocumentLanguage({ countryCode: "BG" })).toBe("bg");
    expect(getDefaultDocumentLanguage({ countryCode: "BG", defaultLanguage: "en" })).toBe("en");
  });
  it("16) друга държава → explicit default или bg (без да се чупи)", () => {
    expect(getDefaultDocumentLanguage({ countryCode: "DE", defaultLanguage: "en" })).toBe("en");
    expect(getDefaultDocumentLanguage({ countryCode: "DE" })).toBe("bg");
    expect(getDefaultDocumentLanguage(null)).toBe("bg");
  });
});

describe("Macedonian document language (§2/§5/§18)", () => {
  it("4/5) mk е в DOC_LANGUAGES с code 'mk'", () => {
    expect(DOC_LANGUAGES.some((l) => l.code === "mk" && l.label === "Македонски")).toBe(true);
  });
  it("mk НЕ е platform Locale, но Е document language", () => {
    expect(isDocLanguage("mk")).toBe(true);
    expect(isDocLanguage("xx")).toBe(false);
  });
  it("10) renderer получава македонски pdf етикети", () => {
    const m = getDocMessages("mk");
    expect(m.pdf.title.invoice).toBe("ФАКТУРА");
    expect(m.pdf.supplier).toBe("ДОБАВУВАЧ");
    expect(m.pdf.grandTotal).toBe("ВКУПНО:");
    expect(m.pdf.vat).toBe("ДДВ");
  });
  it("непреведените namespace-и падат към bg (deepMerge), без счупване", () => {
    const m = getDocMessages("mk");
    expect(m.common).toBeTruthy(); // идва от bg fallback
  });
  it("11) ВСИЧКИ pdf етикети от bg съществуват и на македонски", () => {
    const bgKeys = keys(bgPdf).sort();
    const mkKeys = keys(mkPdf).sort();
    expect(mkKeys).toEqual(bgKeys);
  });
  it("14) македонските етикети са на кирилица (Unicode safe, без липсващи glyph-ове)", () => {
    expect(/[А-Яа-яЃЌЉЊЏЈ]/.test(mkPdf.supplier)).toBe(true);
    JSON.parse(read("src/locales/mk/pdf.json")); // валиден UTF-8 JSON
  });
  it("docIntlLocale: mk → mk-MK; en → en-US; непознат → bg-BG", () => {
    expect(docIntlLocale("mk")).toBe("mk-MK");
    expect(docIntlLocale("en")).toBe("en-US");
    expect(docIntlLocale("xx")).toBe("bg-BG");
  });
  it("17/18) BG и EN рендер непроменени (getDocMessages == getMessages за locale)", () => {
    expect(getDocMessages("bg")).toBe(getMessages("bg"));
    expect(getDocMessages("en")).toBe(getMessages("en"));
  });
  it("19) непознат език → bg fallback", () => {
    expect(getDocMessages("zz").pdf.title.invoice).toBe(getMessages("bg").pdf.title.invoice);
  });
});

describe("source: renderer + flows ползват doc-language (§1/§11/§13/§14)", () => {
  it("InvoiceDocument/OfferDocument ползват getDocMessages(data.language)", () => {
    for (const p of ["src/components/app/InvoiceDocument.tsx", "src/components/app/OfferDocument.tsx"]) {
      const s = read(p);
      expect(s).toContain("getDocMessages(data.language)");
      expect(s).toContain("docIntlLocale(data.language)");
      expect(s).not.toContain("normalizeLocale(data.language)");
    }
  });
  it("3/11) формата и prefill-ите ползват country-aware default", () => {
    expect(read("src/app/(app)/dashboard/documents/new/page.tsx")).toContain("getDefaultDocumentLanguage(c)");
    expect(read("src/app/api/logistics/export-sets/received/bulk-prefill/route.ts")).toContain("getDefaultDocumentLanguage(company)");
    expect(read("src/app/api/logistics/export-sets/received/[id]/invoice-prefill/route.ts")).toContain("getDefaultDocumentLanguage(company)");
  });
  it("9/10) език ≠ валута/ДД: renderer форматира по data.currency и смята по vatRate (независимо)", () => {
    const s = read("src/components/app/InvoiceDocument.tsx");
    expect(s).toContain("data.currency");
    expect(s).toContain("l.vatRate");
  });
});
