import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildDocumentData, formatCertificateLine, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const PARTIES: Parties = {
  seller: { name: "METAL TRADE", address: "A", city: "KYUSTENDIL", country: "BULGARIA", vatNumber: "BG1", registrationNumber: "1", manager: "M" },
  buyer: { name: "SEM", address: "B", city: "SKOPJE", country: "NORTH MACEDONIA", vatNumber: "MK1", registrationNumber: "2", manager: null },
  client: null,
};
const SRC: ExportSetSource = {
  invoiceNumber: "0000000123", invoiceDate: "2026-09-01", shipmentDate: "2026-09-01", destination: "SKOPIE",
  truckRegSnapshot: "CA1234AB", trailerReg: "CA5678EE", productSnapshot: "CEM II A-LL 42.5 R",
  certificateNumberSnapshot: "2032-CPR-19.135C", quantity: 25, unit: "t", declarationCmrDate: "2026-09-01", dispatchNumber: "1",
};
const goodsCert = (dt: "invoice" | "cmr_epson" | "cmr_hp", src = SRC) => {
  const d = buildDocumentData(src, PARTIES, dt) as { goods: { certificate: string | null } | { certificate: string | null }[] };
  return Array.isArray(d.goods) ? d.goods[0].certificate : d.goods.certificate;
};

describe("formatCertificateLine — canonical formatter (§1/§8/§9)", () => {
  it("1) null/празно → null (без ред)", () => {
    expect(formatCertificateLine(null)).toBeNull();
    expect(formatCertificateLine(undefined)).toBeNull();
    expect(formatCertificateLine("   ")).toBeNull();
  });
  it("2) точен canonical формат", () => {
    expect(formatCertificateLine("2032-CPR-19.135C")).toBe("(Certificate No 2032-CPR-19.135C)");
  });
});

describe("Един и същ historical certificate source за трите документа (§2/§17/§20)", () => {
  it("3/5/6) Invoice, CMR EPSON и CMR HP ползват snapshot-а", () => {
    expect(goodsCert("invoice")).toBe("2032-CPR-19.135C");
    expect(goodsCert("cmr_epson")).toBe("2032-CPR-19.135C");
    expect(goodsCert("cmr_hp")).toBe("2032-CPR-19.135C");
  });
  it("7/20) друг продукт → друг сертификат и в трите", () => {
    const other = { ...SRC, productSnapshot: "CEM II B-LL 32.5 R", certificateNumberSnapshot: "2032-CPR-19.79C" };
    for (const dt of ["invoice", "cmr_epson", "cmr_hp"] as const) expect(goodsCert(dt, other)).toBe("2032-CPR-19.79C");
  });
  it("9) липсва snapshot → certificate null (без ред), не hardcoded", () => {
    const legacy = { ...SRC, certificateNumberSnapshot: null };
    for (const dt of ["invoice", "cmr_epson", "cmr_hp"] as const) expect(goodsCert(dt, legacy)).toBeNull();
  });
});

describe("CMR EPSON restored (§5/§11/§13)", () => {
  it("11) cmr_epson е активен тип за генериране", () => {
    expect((ACTIVE_EXPORT_DOC_TYPES as readonly string[]).includes("cmr_epson")).toBe(true);
    expect(isActiveExportDocType("cmr_epson")).toBe(true);
  });
  it("12) генераторът включва cmr_epson в default targets (ACTIVE)", () => {
    const s = read("src/lib/logistics/exportGenerate.ts");
    expect(s).toContain("ACTIVE_EXPORT_DOC_TYPES");
  });
  it("13) CMR шаблонът поддържа layout epson и няма hardcoded сертификат", () => {
    const s = read("src/components/app/logistics/ExportCmrTemplate.tsx");
    expect(s).toContain("epson");
    expect(s).not.toContain("2032-CPR-19.135C"); // премахнат hardcoded default
    expect(s).toContain("formatCertificateLine");
  });
});

describe("No hardcoded certificate mapping / purchase price (§8/§10/§15)", () => {
  it("15) buildDocumentData няма hardcoded сертификатни номера", () => {
    const s = read("src/lib/logistics/exportDocs.ts");
    expect(s).not.toMatch(/2032-CPR|НУРВСПСРБ/);
  });
  it("8) purchasePrice / вътрешни цени не влизат в никой документ", () => {
    for (const dt of ["invoice", "cmr_epson", "cmr_hp", "dispatch", "declaration"] as const) {
      const data = JSON.stringify(buildDocumentData(SRC, PARTIES, dt));
      expect(data.toLowerCase()).not.toContain("purchaseprice");
      expect(data).not.toMatch(/66\.91|70\.00|64\.36/);
    }
  });
  it("шаблоните Invoice/CMR ползват единния formatter (без inline hardcode)", () => {
    expect(read("src/components/app/logistics/ExportInvoiceTemplate.tsx")).toContain("formatCertificateLine");
  });
});

describe("Snapshot on create/edit (§22/§23)", () => {
  it("9) нова доставка снапшотва сертификата на продукта", () => {
    expect(read("src/app/api/logistics/export-sets/route.ts")).toContain("certificateNumberSnapshot: product?.certificateNumber");
  });
  it("23) смяна на продукт при редакция → нов certificateNumberSnapshot", () => {
    const s = read("src/app/api/logistics/export-sets/[id]/route.ts");
    expect(s).toContain("certificateNumberSnapshot = p.certificateNumber");
  });
  it("10) редакция на продукт (master) не пипа ExportDocumentSet snapshots", () => {
    const s = read("src/app/api/logistics/products/[id]/route.ts");
    expect(s).not.toContain("exportDocumentSet");
  });
});

describe("i18n (§25)", () => {
  it("14) docCmrEpson label съществува за всички езици (без raw key)", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${l}/logistics.json`));
      const s = JSON.stringify(j);
      expect(s).toMatch(/docCmrEpson/);
    }
  });
});
