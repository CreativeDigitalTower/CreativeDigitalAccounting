import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { coreValue, isRegularNumber, isSpecialNumber, formatInvoiceNumber, maxRegularValue, computeNextValue, advancedOverride } from "@/lib/invoiceNumbering";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("invoiceNumbering — pure logic (§7/§8/§16)", () => {
  it("Normal sequence: 0002700183 → 0002700184", () => {
    const next = computeNextValue(["0002700181", "0002700182", "0002700183"]);
    expect(formatInvoiceNumber(next)).toBe("0002700184");
  });
  it("Следващ: 0002700184 → 0002700185", () => {
    expect(formatInvoiceNumber(computeNextValue(["0002700184"]))).toBe("0002700185");
  });
  it("ROOT CAUSE: специалната 0002700175-1 НЕ разваля последователността (§8)", () => {
    // Старият bug: strip(\D) → 00027001751 → 27001752. Сега специалната се игнорира.
    const next = computeNextValue(["0002700183", "0002700175-1"]);
    expect(formatInvoiceNumber(next)).toBe("0002700184");
    expect(maxRegularValue(["0002700183", "0002700175-1"])).toBe(2700183);
  });
  it("Leading zeroes: 0002700183 не става 2700184 (§16)", () => {
    const s = formatInvoiceNumber(2700184);
    expect(s).toBe("0002700184");
    expect(s).not.toBe("2700184");
    expect(s.length).toBe(10);
  });
  it("coreValue: редовен → число; специален → null", () => {
    expect(coreValue("0002700183")).toBe(2700183);
    expect(coreValue("0002700175-1")).toBeNull();
    expect(coreValue("0002700175-A")).toBeNull();
    expect(isSpecialNumber("0002700175-1")).toBe(true);
    expect(isRegularNumber("0002700183")).toBe(true);
  });
  it("Manual override: задава точния следващ номер (§11/§15)", () => {
    expect(computeNextValue(["0002700183"], { override: 2700200 })).toBe(2700200);
  });
  it("advancedOverride: редовен номер придвижва +1; специален не мърда (§14)", () => {
    expect(advancedOverride(2700184, "0002700184")).toBe(2700185);
    expect(advancedOverride(2700184, "0002700175-1")).toBe(2700184);
    expect(advancedOverride(2700184, "0002700190")).toBe(2700191); // ръчен по-голям редовен
  });
  it("Prefix (проформа): различна серия, не се смесва", () => {
    const next = computeNextValue(["PF-000000012"], { prefix: "PF-" });
    expect(formatInvoiceNumber(next, 9, "PF-")).toBe("PF-000000013");
    // фактурен номер не се брои за проформа серията
    expect(maxRegularValue(["0002700183"], "PF-")).toBe(0);
  });
  it("startBase (invoiceNumberStart) се спазва", () => {
    expect(computeNextValue([], { startBase: 500 })).toBe(500);
  });
});

describe("Wiring — създаване/редакция/права/одит/isolation (§13/§17/§18/§19/§23)", () => {
  it("create route: атомарно (Serializable) + повторение + advanceInvoiceSequence", () => {
    const s = read("src/app/api/documents/route.ts");
    expect(s).toContain("Serializable");
    expect(s).toContain("advanceInvoiceSequence");
    expect(s).toMatch(/attempt < 4/); // retry при конфликт
  });
  it("edit route НЕ преизчислява номер (§19 — без повторно increment)", () => {
    const s = read("src/app/api/documents/[id]/route.ts");
    expect(s).not.toContain("generateDocumentNumber");
    expect(s).not.toContain("advanceInvoiceSequence");
  });
  it("company sequence API: права (owner/manager/superadmin) + duplicate + audit (§13/§17/§23)", () => {
    const s = read("src/app/api/company/invoice-sequence/route.ts");
    expect(s).toMatch(/\["owner", "manager"\]/);
    expect(s).toContain("isSuperAdmin");
    expect(s).toContain("isNumberTaken");
    expect(s).toContain("invoice_sequence_change");
    expect(s).toContain("auditLog.create");
  });
  it("admin sequence API: само Super Admin, scoped към companyId (§12/§25)", () => {
    const s = read("src/app/api/admin/invoice-sequence/route.ts");
    expect(s).toContain("requireSuperAdmin");
    expect(s).toMatch(/companyId/);
    expect(s).toContain("(Super Admin)");
  });
  it("correction script: scoped по id/ЕИК, не по всички фирми (§22/§28)", () => {
    const s = read("scripts/fix-starclean-invoice-sequence.mjs");
    expect(s).toContain("--eik");
    expect(s).toContain("--id");
    expect(s).toContain("2700184");
    expect(s).not.toMatch(/updateMany/); // никога масов update
  });
});
