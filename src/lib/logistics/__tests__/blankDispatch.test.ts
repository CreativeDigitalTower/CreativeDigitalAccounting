import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildDocumentData, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const PARTIES: Parties = {
  seller: { name: "METAL TRADE", address: "A", city: "KYUSTENDIL", country: "BG", manager: null },
  buyer: { name: "SEM", address: "B", city: "SKOPJE", country: "MK", manager: null },
  client: { name: "ТРИ БРАЌА ДОО", address: "ул.Боца Иванова ББ, Бутел, Скопjе", baseAddress: "Бутел, Скопje", city: "Скопје", registrationNumber: "4030000395960" },
};
const base: ExportSetSource = {
  invoiceNumber: "0000000123", invoiceDate: "2026-09-12", shipmentDate: "2026-09-12", destination: "SKOPIE",
  truckRegSnapshot: "SK501TO", trailerReg: "SK5022AE", productSnapshot: "CEM II A-LL 42.5 R",
  dispatchName: "цемент CEM II A-LL 42.5 R, HOLCIM - рефуз", quantity: 25, unit: "t", declarationCmrDate: "2026-09-12", dispatchNumber: "9705",
};
type Disp = { blankRecipient?: boolean; recipient: { name?: string; address?: string } | null; baseAddress: string | null; date: string; dispatchNumber: string; rows: { material: string; truck: string; quantity: number }[] };
const disp = (src: ExportSetSource, dt: "dispatch" | "blank" = "dispatch") => buildDocumentData(src, PARTIES, dt) as unknown as Disp;

describe("Standard mode (blankDispatchNote=false) — §20/§21", () => {
  const d = disp({ ...base, blankDispatchNote: false });
  it("4/5) recipient data + baseAddress in Denes", () => {
    expect(d.recipient?.name).toBe("ТРИ БРАЌА ДОО");
    expect(d.recipient?.address).toBe("ул.Боца Иванова ББ, Бутел, Скопjе");
    expect(d.baseAddress).toBe("Бутел, Скопje");
    expect(d.blankRecipient).toBe(false);
  });
  it("undefined флаг = стандартно (без регресия)", () => {
    const s = disp(base);
    expect(s.recipient?.name).toBe("ТРИ БРАЌА ДОО");
    expect(s.baseAddress).toBe("Бутел, Скопje");
  });
});

describe("Blank mode (blankDispatchNote=true) — §3/§4/§22", () => {
  const d = disp({ ...base, blankDispatchNote: true });
  it("7/8/9) recipient=null (no client/address/EIK)", () => {
    expect(d.recipient).toBeNull();
    expect(d.blankRecipient).toBe(true);
  });
  it("10) no baseAddress in Denes", () => {
    expect(d.baseAddress).toBeNull();
  });
  it("11/12/13/14/15) дата/материал/dispatchName/камион/количество/номер остават", () => {
    expect(d.date).toBe("2026-09-12");
    expect(d.rows[0].material).toBe("цемент CEM II A-LL 42.5 R, HOLCIM - рефуз");
    expect(d.rows[0].truck).toContain("SK501TO");
    expect(d.rows[0].quantity).toBe(25);
    expect(d.dispatchNumber).toBe("9705");
  });
  it("blank docType also yields blankRecipient", () => {
    expect(disp(base, "blank").blankRecipient).toBe(true);
  });
});

describe("Изолация — Invoice/CMR не се влияят (§22/§27)", () => {
  it("blankDispatchNote не променя invoice/cmr goods", () => {
    const inv = buildDocumentData({ ...base, blankDispatchNote: true }, PARTIES, "invoice") as { seller: { name: string }; goods: { description: string | null }[] };
    expect(inv.seller.name).toBeTruthy();
    expect(inv.goods[0].description).toContain("CEM II A-LL 42.5 R");
    const cmr = buildDocumentData({ ...base, blankDispatchNote: true }, PARTIES, "cmr_hp") as { consignee: { name?: string | null } };
    expect(cmr.consignee?.name).toBe("SEM"); // CMR получателят си остава
  });
});

describe("Wiring (§10/§11/§16/§19/§25)", () => {
  it("schema: ExportDocumentSet.blankDispatchNote Boolean @default(false)", () => {
    expect(read("prisma/schema.prisma")).toMatch(/blankDispatchNote\s+Boolean\s+@default\(false\)/);
  });
  it("create route приема + записва флага (default false)", () => {
    const s = read("src/app/api/logistics/export-sets/route.ts");
    expect(s).toContain("blankDispatchNote: z.boolean().optional()");
    expect(s).toContain("blankDispatchNote: d.blankDispatchNote ?? false");
  });
  it("PATCH приема флага (edit §15)", () => {
    const s = read("src/app/api/logistics/export-sets/[id]/route.ts");
    expect(s).toContain("data.blankDispatchNote = d.blankDispatchNote");
  });
  it("exportGenerate подава set.blankDispatchNote", () => {
    const s = read("src/lib/logistics/exportGenerate.ts");
    expect(s).toContain("blankDispatchNote: true"); // select
    expect(s).toContain("blankDispatchNote: set.blankDispatchNote === true");
  });
  it("template: blankMode = blank || data.blankRecipient", () => {
    const s = read("src/components/app/logistics/ExportDispatchTemplate.tsx");
    expect(s).toContain("const blankMode = blank || !!data.blankRecipient");
    expect(s).toMatch(/recipientText = blankMode \? "" :/);
  });
  it("форма: checkbox + подаване (create+edit)", () => {
    const s = read("src/components/app/logistics/ExportSetForm.tsx");
    expect(s).toContain("blankDispatchNote: !!f.blankDispatchNote");
    expect(s).toContain("logistics.export.blankDispatch");
  });
  it("§9/§23 create не set-ва clientId=null заради blank; blank е отделно поле", () => {
    const s = read("src/app/api/logistics/export-sets/route.ts");
    // clientId идва независимо от blankDispatchNote
    expect(s).toContain("clientId: d.clientId || null");
  });
  it("i18n blankDispatch за всички езици", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) expect(JSON.parse(read(`src/locales/${l}/logistics.json`)).export?.blankDispatch).toBeTruthy();
  });
});
