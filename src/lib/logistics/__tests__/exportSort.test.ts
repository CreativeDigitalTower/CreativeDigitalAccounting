import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { formatSequenceNumber, EXPORT_INVOICE_FORMAT } from "@/lib/logistics/config";

const read = (p: string) => fs.readFileSync(p, "utf-8");

// Повтаря маппинга sort → Prisma orderBy от API-то (export-sets route), за да тества реда.
function orderKey(sort: string | null | undefined, trash = false): { field: string; dir: "desc" } {
  if (trash) return { field: "deletedAt", dir: "desc" };
  const s = sort ?? "invoice"; // default
  if (s === "quantity") return { field: "quantity", dir: "desc" };
  if (s === "invoice") return { field: "invoiceNumber", dir: "desc" };
  if (s === "date") return { field: "invoiceDate", dir: "desc" };
  return { field: "invoiceNumber", dir: "desc" }; // непознат → default invoice
}

describe("Export deliveries — default sort = фактура DESC", () => {
  it("1) без подаден sort → invoiceNumber DESC", () => {
    expect(orderKey(undefined)).toEqual({ field: "invoiceNumber", dir: "desc" });
    expect(orderKey(null)).toEqual({ field: "invoiceNumber", dir: "desc" });
    expect(orderKey("")).toEqual({ field: "invoiceNumber", dir: "desc" });
  });

  it("2) zero-padded номерата се подреждат числово при лексикографско DESC", () => {
    const nums = [9757, 9759, 9758, 9756].map((n) => formatSequenceNumber(n, EXPORT_INVOICE_FORMAT));
    const sorted = [...nums].sort((a, b) => b.localeCompare(a)); // DESC, както Prisma string desc
    expect(sorted).toEqual(["0000009759", "0000009758", "0000009757", "0000009756"]);
  });

  it("2b) няма проблем от типа 1,10,100 — фиксирана ширина 10", () => {
    const nums = [1, 10, 100, 11, 2].map((n) => formatSequenceNumber(n, EXPORT_INVOICE_FORMAT));
    expect([...nums].sort()).toEqual(["0000000001", "0000000002", "0000000010", "0000000011", "0000000100"]);
  });

  it("3) explicit sort=date → invoiceDate DESC", () => {
    expect(orderKey("date")).toEqual({ field: "invoiceDate", dir: "desc" });
  });
  it("4) explicit sort=quantity → quantity DESC", () => {
    expect(orderKey("quantity")).toEqual({ field: "quantity", dir: "desc" });
  });
  it("5) explicit sort=invoice → invoiceNumber DESC", () => {
    expect(orderKey("invoice")).toEqual({ field: "invoiceNumber", dir: "desc" });
  });
  it("Кошче пази реда по deletedAt DESC независимо от sort", () => {
    expect(orderKey("invoice", true)).toEqual({ field: "deletedAt", dir: "desc" });
  });
});

describe("Source: default sort е 'invoice' и в API, и в компонента", () => {
  it("API fallback е invoice (server-side orderBy)", () => {
    const api = read("src/app/api/logistics/export-sets/route.ts");
    expect(api).toContain('sp.get("sort") ?? "invoice"');
    expect(api).toContain('sort === "invoice" ? { invoiceNumber: "desc" }');
    // Опциите „дата" и „количество" остават.
    expect(api).toContain('sort === "quantity" ? { quantity: "desc" }');
    expect(api).toContain('{ invoiceDate: "desc" }');
  });
  it("Компонентът стартира със sort='invoice' (реален state, не само визуално)", () => {
    const list = read("src/components/app/logistics/ExportSetsList.tsx");
    expect(list).toContain('useState("invoice")');
    // Всички три опции са налични в dropdown-а.
    expect(list).toContain('value="date"');
    expect(list).toContain('value="quantity"');
    expect(list).toContain('value="invoice"');
  });
});
