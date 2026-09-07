import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const SRC: ExportSetSource = {
  invoiceNumber: "0000000123", invoiceDate: "2026-05-01", shipmentDate: "2026-05-19", destination: "SKOPIE",
  truckRegSnapshot: "SK1234AB", trailerReg: "SK5678EE", productSnapshot: "CEM II A-LL 42.5 R",
  quantity: 25, unit: "t", declarationCmrDate: "2026-05-19", dispatchNumber: "9705",
};
const parties = (client: Parties["client"]): Parties => ({
  seller: { name: "METAL TRADE", address: "A", city: "KYUSTENDIL", country: "BG", manager: null },
  buyer: { name: "SEM", address: "B", city: "SKOPJE", country: "MK", manager: null },
  client,
});
const disp = (client: Parties["client"], blank = false) =>
  buildDocumentData(SRC, parties(client), blank ? "blank" : "dispatch") as { recipient: { name: string; address: string } | null; baseAddress: string | null; date: string };

const TRI = { name: "ТРИ БРАЌА ДОО", address: "ул.Боца Иванова ББ, Бутел, Скопjе", baseAddress: "Бутел, Скопje", city: "Скопје", registrationNumber: "4030000395960" };
const DM = { name: "ДМ-ПРЕЦИЗ ДОО", address: "Индустриска зона Македонка бр.18, ШТИП", baseAddress: "ШТИП, ул.Балканска бр.98", city: "Штип", registrationNumber: "4029998115950" };

describe("Dispatch data mapping — registration vs base address (§1/§4/§6)", () => {
  it("1/2/3) recipient.address = registration; baseAddress = client.baseAddress (различни)", () => {
    const d = disp(TRI);
    expect(d.recipient!.address).toBe("ул.Боца Иванова ББ, Бутел, Скопjе"); // „До:" → registration
    expect(d.baseAddress).toBe("Бутел, Скопje");                            // „Денес…" → base
    expect(d.recipient!.address).not.toBe(d.baseAddress);
  });
  it("24) втори пример ДМ-ПРЕЦИЗ доказва разделянето", () => {
    const d = disp(DM);
    expect(d.recipient!.address).toContain("Индустриска зона Македонка бр.18");
    expect(d.baseAddress).toBe("ШТИП, ул.Балканска бр.98");
  });
  it("7) датата е shipment date (не invoice/now)", () => {
    expect(disp(TRI).date).toBe("2026-05-19");
  });
  it("9/10) null baseAddress → null (БЕЗ fallback към registration address)", () => {
    const d = disp({ name: "GRADIS-KOO DOOEL", address: "Nikushtak, Kumanovo", baseAddress: null, city: "Kumanovo" });
    expect(d.baseAddress).toBeNull();
    expect(d.recipient!.address).toBe("Nikushtak, Kumanovo"); // registration остава
  });
  it("blank → recipient null и baseAddress null", () => {
    const d = disp(TRI, true);
    expect(d.recipient).toBeNull();
    expect(d.baseAddress).toBeNull();
  });
});

describe("Template & editor wiring (§2/§3/§6/§12/§13)", () => {
  it("4/6) template renders base-address sentence from data.baseAddress", () => {
    const s = read("src/components/app/logistics/ExportDispatchTemplate.tsx");
    expect(s).toContain("во бетонска база во");
    expect(s).toContain("Ви доставуваме следните материјали");
    expect(s).toContain("data.baseAddress");
  });
  it("3/11) recipient line uses recipient.address (registration), not baseAddress", () => {
    const s = read("src/components/app/logistics/ExportDispatchTemplate.tsx");
    expect(s).toMatch(/recipientText = blank \? "" : \[data\.recipient\?\.name, data\.recipient\?\.address, data\.recipient\?\.city\]/);
  });
  it("3-editor) registration + base address fields (baseAddress path)", () => {
    const s = read("src/components/app/logistics/ExportDocEditor.tsx");
    expect(s).toContain('logistics.export.regAddress"), "recipient.address"');
    expect(s).toContain('logistics.export.baseAddress"), "baseAddress"');
  });
  it("17) client party идва от canonical (exportGenerate select baseAddress)", () => {
    const s = read("src/lib/logistics/exportGenerate.ts");
    expect(s).toMatch(/baseAddress: true/);
    expect(s).toContain("baseAddress: client.baseAddress");
  });
});

describe("Snapshot / no schema change (§8/§22)", () => {
  it("baseAddress живее в ExportDocument.data (JSON) — без нови колони", () => {
    expect(read("prisma/schema.prisma")).not.toMatch(/baseAddressSnapshot/);
  });
  it("16) promote checkbox does not write Client (no address/baseAddress)", () => {
    const s = read("src/components/app/logistics/ExportDocEditor.tsx");
    const shared = s.slice(s.indexOf("function sharedFromData"), s.indexOf("function sharedFromData") + 500);
    expect(shared).not.toContain("baseAddress");
    expect(shared).not.toContain("address");
  });
  it("i18n regAddress/baseAddress за всички езици", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${l}/logistics.json`));
      expect(j.export?.regAddress).toBeTruthy();
      expect(j.export?.baseAddress).toBeTruthy();
    }
  });
});
