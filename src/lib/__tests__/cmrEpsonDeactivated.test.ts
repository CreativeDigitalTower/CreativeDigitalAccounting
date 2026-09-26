import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { ACTIVE_EXPORT_DOC_TYPES, EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const SRC: ExportSetSource = {
  invoiceNumber: "0000009900", invoiceDate: "2026-09-26T00:00:00.000Z", shipmentDate: "2026-09-26T00:00:00.000Z",
  destination: "SHTIP", truckRegSnapshot: "ST8669AE", trailerReg: "ST5407AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900", quantity: 23.8, unit: "t",
  declarationCmrDate: null, dispatchNumber: "9900",
};
const PARTIES: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", city: "Tetovo", country: "North Macedonia" },
  client: null,
};

describe("CMR Epson — временно деактивиран от активния workflow (§2-§7/§14)", () => {
  it("1/2) supported document types все още съдържат cmr_epson", () => {
    expect((EXPORT_DOC_TYPES as readonly string[]).includes("cmr_epson")).toBe(true);
  });
  it("2) active/default document types НЕ съдържат cmr_epson", () => {
    expect((ACTIVE_EXPORT_DOC_TYPES as readonly string[]).includes("cmr_epson")).toBe(false);
    expect(isActiveExportDocType("cmr_epson")).toBe(false);
  });
  it("8) активните 4 документа са Invoice/Dispatch/Declaration/CMR HP", () => {
    expect([...ACTIVE_EXPORT_DOC_TYPES]).toEqual(["invoice", "dispatch", "declaration", "cmr_hp"]);
  });
  it("3/4) Generate All ползва ACTIVE_EXPORT_DOC_TYPES по подразбиране (без cmr_epson, с cmr_hp)", () => {
    const gen = read("src/lib/logistics/exportGenerate.ts");
    // default targets = [...ACTIVE_EXPORT_DOC_TYPES]; cmr_epson не е в ACTIVE → не се генерира.
    expect(gen).toContain("[...ACTIVE_EXPORT_DOC_TYPES]");
    expect(isActiveExportDocType("cmr_hp")).toBe(true);
  });
  it("5/6/7) Invoice/Dispatch/Declaration остават активни", () => {
    expect(isActiveExportDocType("invoice")).toBe(true);
    expect(isActiveExportDocType("dispatch")).toBe(true);
    expect(isActiveExportDocType("declaration")).toBe(true);
  });
  it("9) completion total = 4 (без cmr_epson → доставка с 4 документа е пълна)", () => {
    expect(ACTIVE_EXPORT_DOC_TYPES.length).toBe(4);
  });
  it("10) CMR Epson шаблонът/генерацията НЕ са изтрити (buildDocumentData работи)", () => {
    const ep = buildDocumentData(SRC, PARTIES, "cmr_epson") as Record<string, unknown>;
    expect(ep).toBeTruthy();
    expect(ep.layout).toBe("epson");
    expect(ep.destination).toBe("SHTIP");
  });
  it("10) CMR Epson component/template/print файловете съществуват", () => {
    expect(fs.existsSync("src/components/app/logistics/ExportCmrTemplate.tsx")).toBe(true);
    expect(read("src/lib/logistics/exportDocs.ts")).toContain('case "cmr_epson"');
  });
  it("11/12) detail страницата показва исторически (деактивиран) документ, без генериране/completion", () => {
    const s = read("src/components/app/logistics/ExportSetDetail.tsx");
    expect(s).toContain("!isActiveExportDocType(d.docType)");
    expect(s).toContain("historicalDoc");
  });
  it("13) CMR HP остава активен (непроменен)", () => {
    expect(isActiveExportDocType("cmr_hp")).toBe(true);
    const hp = buildDocumentData(SRC, PARTIES, "cmr_hp") as Record<string, unknown>;
    expect(hp.layout).toBe("hp");
    expect(hp.destination).toBe("SHTIP");
  });
});
