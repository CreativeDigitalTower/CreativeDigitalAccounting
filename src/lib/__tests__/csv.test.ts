import { describe, it, expect } from "vitest";
import { csvEscape, toCsv } from "@/lib/csv";

describe("csvEscape", () => {
  it("leaves plain values unquoted", () => {
    expect(csvEscape("SK111AA")).toBe("SK111AA");
    expect(csvEscape(26)).toBe("26");
    expect(csvEscape(null)).toBe("");
  });
  it("quotes and doubles embedded quotes", () => {
    expect(csvEscape('a"b')).toBe('"a""b"');
  });
  it("quotes values with delimiter, semicolon or newline", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("a;b")).toBe('"a;b"');
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });
  it("honors a custom delimiter", () => {
    expect(csvEscape("a;b", ";")).toBe('"a;b"');
  });
});

describe("toCsv", () => {
  it("builds RFC4180 rows with CRLF", () => {
    const csv = toCsv(["Влекач", "Курсове", "Тонове"], [["SK111AA", 2, 50], ["SK,222", 1, 23.8]]);
    expect(csv).toBe('Влекач,Курсове,Тонове\r\nSK111AA,2,50\r\n"SK,222",1,23.8');
  });
  it("handles empty rows", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });
});
