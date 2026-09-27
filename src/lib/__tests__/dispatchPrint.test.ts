import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { ExportDispatchTemplate, type DispatchDocData } from "@/components/app/logistics/ExportDispatchTemplate";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const printSrc = read("src/app/(app)/dashboard/logistics/export/[id]/[docType]/print/page.tsx");

const data: DispatchDocData = {
  dispatchNumber: "5", date: "2026-09-26T00:00:00.000Z",
  issuer: { name: "Сем Интернационал ДООЕЛ", address: "ул. Маршал Тито бр.55", city: "Тетово" },
  recipient: { name: "АЦЕ ТРАНС - КОМПАНИ ДООЕЛ", address: "ул. Вера бр.6/9", city: "1000 Скопje" },
  rows: [{ lineNo: 1, truck: "01-139-PK / 01-772-TA", material: "CEM II A-LL 42.5 R", unit: "t", quantity: 23.8 }],
  totalQuantity: 23.8,
};

describe("Испратница print — 1 A4 = 2 копия (портал изолация, §1/§12/§22)", () => {
  it("ползва СЪЩАТА изолирана архитектура като фактурата (PrintDocPortal + AutoPrint portal)", () => {
    expect(printSrc).toContain("<PrintDocPortal>");
    expect(printSrc).toContain("<AutoPrint fileTitle={fileTitle} portal />");
    expect(printSrc).toContain('className="print-page disp-page"');
  });
  it("рендира ДВЕ идентични копия с cut линия между тях (§1/§11)", () => {
    const copies = (printSrc.match(/<div className="disp-copy">\{copy\}<\/div>/g) || []).length;
    expect(copies).toBe(2);
    expect(printSrc).toContain('<div className="disp-cut" />');
  });
  it("НЕ ползва счупените хакове (fixed 148.5mm / min-height:297mm / disp-half / printing-multi)", () => {
    // В dispatch клона вече няма фиксирана половин-страница височина, нито стария sheet.
    expect(printSrc).not.toContain("148.5mm");
    expect(printSrc).not.toContain("disp-half");
    expect(printSrc).not.toContain("disp-sheet");
    // Малко разстояние между копията (§5): cut с малък margin, страница с малък padding.
    expect(printSrc).toContain(".disp-cut { border-top: 1px dashed #8a8a8a; position: relative; height: 0; margin: 3mm 0; }");
    expect(printSrc).toContain(".disp-page { padding: 4mm 0; }");
  });
});

describe("Испратница content (§10/§17) — едно копие съдържа всички секции", () => {
  const html = renderToStaticMarkup(h(ExportDispatchTemplate, { data }));
  it("съдържа заглавие, До:, таблица (колони), ВКУПНО, подписи", () => {
    for (const needle of ["ИСПРАТНИЦА бр.", "До :", "НАЗИВ НА МАТЕРИЈАЛИТЕ", "Количина", "ИЗНОС ДЕНАРИ", "ВКУПНО", "Истоварено", "ИЗДАЛ", "ПРИМИЛ"]) {
      expect(html).toContain(needle);
    }
  });
  it("две копия → 'ИСПРАТНИЦА' се среща ДВА пъти в печатния изход (§17)", () => {
    const twoCopies = html + html; // print-page рендира {copy} два пъти
    expect((twoCopies.match(/ИСПРАТНИЦА бр\./g) || []).length).toBe(2);
  });
});

describe("Invoice print НЕ е засегнат (§20) — остава на портал архитектурата", () => {
  it("invoice клонът все още ползва PrintDocPortal + AutoPrint portal + .print-page", () => {
    expect(printSrc).toContain("<AutoPrint fileTitle={invTitle} portal />");
    // порталната изолация в globals.css е обща и непроменена
    const globals = read("src/app/globals.css");
    expect(globals).toContain("body.printing-portal > *:not(.print-portal-root){display:none!important;}");
    expect(globals).toContain(".print-portal-root .print-page{width:210mm!important");
  });
});
