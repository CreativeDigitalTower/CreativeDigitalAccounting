import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const PARTIES: Parties = {
  seller: { name: "METAL TRADE", address: "A", city: "KYUSTENDIL", country: "BG", manager: null },
  buyer: { name: "SEM", address: "B", city: "SKOPJE", country: "MK", manager: null },
  client: { name: "ТРИ БРАЌА ДОО", address: "ул.Боца, Скопje", baseAddress: "Бутел", city: "Скопје", registrationNumber: "1" },
};
const base: ExportSetSource = {
  invoiceNumber: "0000000123", invoiceDate: "2026-05-01", shipmentDate: "2026-05-19", destination: "SKOPIE",
  truckRegSnapshot: "SK1", trailerReg: "SK2", productSnapshot: "CEM II A-LL 42.5 R",
  quantity: 25, unit: "t", declarationCmrDate: "2026-05-19", dispatchNumber: "9705",
};
const material = (src: ExportSetSource, dt: "dispatch" | "invoice" | "cmr_hp") => {
  const d = buildDocumentData(src, PARTIES, dt) as { rows?: { material: string }[]; goods?: { description?: string | null } | { description?: string | null }[] };
  if (dt === "dispatch") return d.rows![0].material;
  const g = d.goods;
  return Array.isArray(g) ? g[0].description : g!.description;
};

describe("Dispatch material uses dispatchName (§7/§8/§18)", () => {
  it("5) initial material = dispatchName", () => {
    expect(material({ ...base, dispatchName: "цемент CEM II A-LL 42.5 R, HOLCIM - рефуз" }, "dispatch"))
      .toBe("цемент CEM II A-LL 42.5 R, HOLCIM - рефуз");
  });
  it("8-packaged) packaged exact text", () => {
    expect(material({ ...base, productSnapshot: "CEM II B-LL 42.5 R", dispatchName: "Цемент - 17 ПАЛЕТИ, 952 ВРЕКИ х 25КГ" }, "dispatch"))
      .toBe("Цемент - 17 ПАЛЕТИ, 952 ВРЕКИ х 25КГ");
  });
  it("6) fallback → productSnapshot когато dispatchName е null", () => {
    expect(material({ ...base, dispatchName: null }, "dispatch")).toBe("CEM II A-LL 42.5 R");
    expect(material({ ...base, dispatchName: "" }, "dispatch")).toBe("CEM II A-LL 42.5 R");
  });
  it("15/16) Invoice и CMR НЕ ползват dispatchName (ползват productSnapshot)", () => {
    const src = { ...base, dispatchName: "цемент CEM II A-LL 42.5 R, HOLCIM - рефуз" };
    expect(material(src, "invoice")).toContain("CEM II A-LL 42.5 R");
    expect(material(src, "invoice")).not.toContain("HOLCIM - рефуз");
    expect(material(src, "cmr_hp")).not.toContain("HOLCIM - рефуз");
  });
});

describe("Wiring (§1/§2/§10/§12)", () => {
  it("1) schema има LogisticsProduct.dispatchName (nullable)", () => {
    expect(read("prisma/schema.prisma")).toMatch(/dispatchName\s+String\?/);
  });
  it("2/3) products API create/patch приемат dispatchName", () => {
    expect(read("src/app/api/logistics/products/route.ts")).toContain("dispatchName");
    expect(read("src/app/api/logistics/products/[id]/route.ts")).toContain("dispatchName");
  });
  it("10) exportGenerate подава product.dispatchName в src", () => {
    const s = read("src/lib/logistics/exportGenerate.ts");
    expect(s).toContain("dispatchName: true");
    expect(s).toContain("dispatchName: product?.dispatchName");
  });
  it("dispatch материалът е единственото място с fallback dispatchName ?? productSnapshot", () => {
    const s = read("src/lib/logistics/exportDocs.ts");
    expect(s).toMatch(/material: \(src\.dispatchName \?\? ""\)\.trim\(\) \|\| src\.productSnapshot/);
  });
  it("4) Export Delivery dropdown ползва canonicalName (не dispatchName)", () => {
    const s = read("src/app/(app)/dashboard/logistics/export/new/page.tsx");
    expect(s).toContain("canonicalName");
    expect(s).not.toContain("dispatchName");
  });
  it("9/11/15) promote не пише material/Product (само truck/quantity)", () => {
    const s = read("src/components/app/logistics/ExportDocEditor.tsx");
    const shared = s.slice(s.indexOf("function sharedFromData"), s.indexOf("function sharedFromData") + 500);
    expect(shared).not.toContain("material");
    expect(shared).not.toContain("dispatchName");
  });
});

describe("Data script (§6/§16/§17)", () => {
  const s = read("scripts/update-dispatch-product-names.mjs");
  it("7/8) точните 6 стойности", () => {
    for (const g of ["CEM II A-LL 42.5 R", "CEM II A-LL 52.5 N", "CEM II B-V 52.5 N"]) expect(s).toContain(`BULK("${g}")`);
    expect(s).toContain("цемент ${grade}, HOLCIM - рефуз");
    expect(s).toContain("Цемент - 17 ПАЛЕТИ, 952 ВРЕКИ х 25КГ");
    for (const n of ["CEM II B-LL 32.5 R", "CEM II B-LL 42.5 R", "CEM II C-M (V-LL) 42.5 N"]) expect(s).toContain(`name: "${n}"`);
  });
  it("17/18) idempotent + scoped; само dispatchName write", () => {
    expect(s).toMatch(/APPLY = process\.argv\.includes\("--apply"\)/);
    expect(s).toContain("NO_CHANGE");
    expect(s).toContain("data: { dispatchName: tgt.dispatchName }");
    expect(s).toContain("companyId: company.id");
    expect(s).not.toContain("certificateNumber:");
    expect(s).not.toContain("purchasePrice:");
  });
  it("i18n products.dispatchName за всички езици", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) expect(JSON.parse(read(`src/locales/${l}/logistics.json`)).products?.dispatchName).toBeTruthy();
  });
});
