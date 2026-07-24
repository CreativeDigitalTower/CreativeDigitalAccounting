import { describe, it, expect } from "vitest";
import { compareByDefault, sortDocs, docNumberValue, type SortableDoc } from "@/lib/documentSort";

const d = (issueDate: string, number: string, createdAt: string, extra: Partial<SortableDoc> = {}): SortableDoc =>
  ({ issueDate, number, createdAt, ...extra });

describe("docNumberValue", () => {
  it("извлича числовата стойност независимо от префикс/нули", () => {
    expect(docNumberValue("0000000010")).toBe(10);
    expect(docNumberValue("PF-000000009")).toBe(9);
    expect(docNumberValue("")).toBe(0);
  });
});

describe("compareByDefault — дата ↓, номер ↓, createdAt ↓", () => {
  it("по-новата дата на издаване е първа", () => {
    const a = d("2026-03-01", "1", "2020-01-01");
    const b = d("2026-01-01", "999", "2026-07-01"); // въведена по-късно, но издадена по-рано
    expect(compareByDefault(a, b)).toBeLessThan(0); // a преди b
  });
  it("при еднаква дата — по-големият номер е първи (числово)", () => {
    const a = d("2026-01-01", "0000000010", "2020-01-01");
    const b = d("2026-01-01", "0000000009", "2026-07-01");
    expect(compareByDefault(a, b)).toBeLessThan(0); // 10 преди 9
  });
  it("при еднаква дата и номер — по-новият createdAt е първи", () => {
    const a = d("2026-01-01", "5", "2026-07-02");
    const b = d("2026-01-01", "5", "2026-07-01");
    expect(compareByDefault(a, b)).toBeLessThan(0);
  });
});

describe("sortDocs — стар документ застава на правилното място", () => {
  it("подрежда по подразбиране по дата на издаване, не по createdAt", () => {
    const today = d("2026-01-15", "0000000050", "2026-07-20T10:00:00Z"); // въведена днес, издадена преди месец
    const recent = d("2026-07-19", "0000000100", "2026-07-19T09:00:00Z");
    const sorted = sortDocs([today, recent]);
    expect(sorted[0]).toBe(recent); // по-новата издадена дата е най-отгоре
    expect(sorted[1]).toBe(today);
  });
  it("number_asc/desc са числови", () => {
    const rows = [d("2026-01-01", "0000000002", "x"), d("2026-01-01", "0000000010", "y")];
    expect(sortDocs(rows, "number_desc")[0].number).toBe("0000000010");
    expect(sortDocs(rows, "number_asc")[0].number).toBe("0000000002");
  });
  it("client_asc/desc по име", () => {
    const rows = [d("2026-01-01", "1", "x", { clientName: "Яна" }), d("2026-01-01", "2", "y", { clientName: "Ани" })];
    expect(sortDocs(rows, "client_asc")[0].clientName).toBe("Ани");
    expect(sortDocs(rows, "client_desc")[0].clientName).toBe("Яна");
  });
  it("value_desc/asc по стойност", () => {
    const rows = [d("2026-01-01", "1", "x", { total: 100 }), d("2026-01-01", "2", "y", { total: 500 })];
    expect(sortDocs(rows, "value_desc")[0].total).toBe(500);
    expect(sortDocs(rows, "value_asc")[0].total).toBe(100);
  });
  it("due_desc по падеж", () => {
    const rows = [d("2026-01-01", "1", "x", { dueDate: "2026-02-01" }), d("2026-01-01", "2", "y", { dueDate: "2026-05-01" })];
    expect(sortDocs(rows, "due_desc")[0].dueDate).toBe("2026-05-01");
  });
  it("не мутира входния масив", () => {
    const rows = [d("2026-01-01", "1", "x"), d("2026-02-01", "2", "y")];
    const copy = [...rows];
    sortDocs(rows);
    expect(rows).toEqual(copy);
  });
});
