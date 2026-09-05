import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const PARTIES: Parties = {
  seller: { name: "METAL TRADE", address: "A", city: "KYUSTENDIL", country: "BULGARIA", vatNumber: "BG1", registrationNumber: "1", manager: "M" },
  buyer: { name: "SEM", address: "B", city: "SKOPJE", country: "NORTH MACEDONIA", vatNumber: "MK1", registrationNumber: "2", manager: null },
  client: null,
};
const SRC: ExportSetSource = {
  invoiceNumber: "0000000123", invoiceDate: "2026-09-01", shipmentDate: "2026-09-01", destination: "SKOPIE",
  truckRegSnapshot: "CA1234AB", trailerReg: "CA5678EE", productSnapshot: "CEM II B-V 52.5 N",
  certificateNumberSnapshot: "2032-CPR-25.2", quantity: 25, unit: "t", declarationCmrDate: "2026-09-01", dispatchNumber: "1",
};

describe("Invoice dynamic certificate (§16/§35)", () => {
  it("11) сертификатът във фактурата идва динамично от snapshot-а на доставката", () => {
    const inv = buildDocumentData(SRC, PARTIES, "invoice") as { goods: { certificate: string | null }[] };
    expect(inv.goods[0].certificate).toBe("2032-CPR-25.2");
  });
  it("друг продукт → друг сертификат", () => {
    const inv = buildDocumentData({ ...SRC, productSnapshot: "CEM II C-M (V-LL) 42.5 N", certificateNumberSnapshot: "07-НУРВСПСРБ-24.19" }, PARTIES, "invoice") as { goods: { certificate: string | null }[] };
    expect(inv.goods[0].certificate).toBe("07-НУРВСПСРБ-24.19");
  });
  it("липсващ snapshot → без сертификат (без grешка)", () => {
    const inv = buildDocumentData({ ...SRC, certificateNumberSnapshot: null }, PARTIES, "invoice") as { goods: { certificate: string | null }[] };
    expect(inv.goods[0].certificate).toBeNull();
  });
  it("12/14/36) purchasePrice НЕ присъства в НИКОЙ генериран документ (§18)", () => {
    for (const dt of ["invoice", "dispatch", "declaration", "cmr_hp", "cmr_epson", "blank"] as const) {
      const data = JSON.stringify(buildDocumentData(SRC, PARTIES, dt));
      expect(data.toLowerCase()).not.toContain("purchaseprice");
      expect(data).not.toContain("64.36");
      expect(data).not.toContain("66.91");
    }
  });
});

describe("Snapshot architecture (§17)", () => {
  it("генераторът ползва snapshot-а на доставката, fallback към продукта", () => {
    const s = read("src/lib/logistics/exportGenerate.ts");
    expect(s).toContain("certificateNumberSnapshot: true"); // чете snapshot от set
    expect(s).toMatch(/set\.certificateNumberSnapshot \?\? product\?\.certificateNumber/);
  });
  it("export-set create снапшотва сертификата към момента", () => {
    const s = read("src/app/api/logistics/export-sets/route.ts");
    expect(s).toContain("certificateNumberSnapshot: product?.certificateNumber");
  });
});

describe("Products API — cert/price persistence + validation (§7/§20/§30)", () => {
  it("1/2/3) create/edit приемат certificateNumber, purchasePrice, purchaseCurrency", () => {
    for (const p of ["src/app/api/logistics/products/route.ts", "src/app/api/logistics/products/[id]/route.ts"]) {
      const s = read(p);
      expect(s).toContain("certificateNumber");
      expect(s).toContain("purchasePrice");
      expect(s).toContain("purchaseCurrency");
    }
  });
  it("4/5) отрицателна цена и невалидна валута се отхвърлят", () => {
    const s = read("src/app/api/logistics/products/route.ts");
    expect(s).toMatch(/purchasePrice:\s*z\.number\(\)\.min\(0\)/);
    expect(s).toContain("CURRENCY_CODES.includes");
  });
  it("6/7/8/9/10) PDF-only upload + защитен download + delete", () => {
    const up = read("src/app/api/logistics/products/[id]/certificate/route.ts");
    expect(up).toMatch(/mime !== "application\/pdf"/);
    expect(up).toContain("validateUpload");
    expect(up).toContain("manage_rates");
    expect(up).toContain("DELETE");
    const file = read("src/app/api/logistics/products/[id]/certificate/file/route.ts");
    expect(file).toContain("view_logistics");
    expect(file).toContain("fileResponse");
  });
  it("purchasePrice е Decimal в схемата (§7)", () => {
    const s = read("prisma/schema.prisma");
    expect(s).toMatch(/purchasePrice\s+Decimal\?\s+@db\.Decimal/);
  });
});

describe("Production update script (§21-§29/§31-§32)", () => {
  const s = read("scripts/update-cement-certificates-prices.mjs");
  it("17/18/19) точните 6 canonical имена, сертификати и цени", () => {
    const expected = [
      ["CEM II A-LL 42.5 R", "2032-CPR-19.135C", "66.91", "bulk"],
      ["CEM II A-LL 52.5 N", "2032-CPR-20.18A", "70", "bulk"],
      ["CEM II B-V 52.5 N", "2032-CPR-25.2", "64.36", "bulk"],
      ["CEM II B-LL 42.5 R", "2032-CPR-19.78C", "69.47", "packaged"],
      ["CEM II B-LL 32.5 R", "2032-CPR-19.79C", "66.91", "packaged"],
      ["CEM II C-M (V-LL) 42.5 N", "07-НУРВСПСРБ-24.19", "64.36", "packaged"],
    ];
    for (const [name, cert, price, cat] of expected) {
      expect(s, `name ${name}`).toContain(`name: "${name}"`);
      expect(s, `cert ${cert}`).toContain(`certificate: "${cert}"`);
      expect(s, `price ${price}`).toContain(`price: ${price}`);
      expect(s).toContain(`category: "${cat}"`);
    }
  });
  it("13/16) rename с добавяне на старо име като alias; категориите bulk/packaged", () => {
    expect(s).toContain("logisticsProductAlias.create");
    expect(s).toMatch(/CEM II B0LL 52.5 N|CEM II B-LL 52.5 N/); // стар вариант за B-V
    expect(s).toContain("CEM II C-M V-LL 42.5 N"); // стар вариант за (V-LL)
  });
  it("22/28) scoped към конкретна фирма; никакъв масов/чужд update", () => {
    expect(s).toContain("--company-id");
    expect(s).toContain("--eik");
    expect(s).not.toMatch(/updateMany/);
    expect(s).toContain("companyId: company.id");
  });
  it("17/24) material code НЕ се пипа при update", () => {
    // update data не съдържа materialCode
    const updBlock = s.slice(s.indexOf("logisticsProduct.update"), s.indexOf("logisticsProduct.update") + 400);
    expect(updBlock).not.toContain("materialCode");
  });
  it("26) STOP при ambiguous/missing (не гади)", () => {
    expect(s).toContain("AMBIGUOUS");
    expect(s).toContain("MISSING");
    expect(s).toMatch(/process\.exit\(1\)/);
  });
});

describe("i18n parity (§37.24)", () => {
  it("logistics.products cert/price ключове за всички езици", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${l}/logistics.json`));
      expect(j.products?.certificate, `certificate ${l}`).toBeTruthy();
      expect(j.products?.purchasePrice, `purchasePrice ${l}`).toBeTruthy();
      expect(j.products?.uploadCert, `uploadCert ${l}`).toBeTruthy();
    }
  });
});
