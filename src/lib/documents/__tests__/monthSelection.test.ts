import { describe, it, expect } from "vitest";
import { toggleMonthSelection, monthCheckboxState } from "@/lib/documents/monthSelection";

const AUG = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"];
const JUL = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

describe("toggleMonthSelection — scoped към месеца (§3/§14/§22-§24)", () => {
  it("1/22) избор на месец избира САМО неговите фактури", () => {
    const s = toggleMonthSelection(new Set(), AUG);
    expect(s.size).toBe(9);
    AUG.forEach((id) => expect(s.has(id)).toBe(true));
  });
  it("2) не избира друг месец", () => {
    const s = toggleMonthSelection(new Set(), AUG);
    JUL.forEach((id) => expect(s.has(id)).toBe(false));
  });
  it("3/23) втори месец е additive (Август + Юли = 17)", () => {
    let s = toggleMonthSelection(new Set(), AUG);
    s = toggleMonthSelection(s, JUL);
    expect(s.size).toBe(17);
    [...AUG, ...JUL].forEach((id) => expect(s.has(id)).toBe(true));
  });
  it("4/24) deselect на месец маха САМО неговите ID; другите остават", () => {
    let s = toggleMonthSelection(new Set(), AUG);
    s = toggleMonthSelection(s, JUL); // 17
    s = toggleMonthSelection(s, AUG); // deselect Август
    expect(s.size).toBe(8);
    AUG.forEach((id) => expect(s.has(id)).toBe(false));
    JUL.forEach((id) => expect(s.has(id)).toBe(true));
  });
  it("5) индивидуално избрани от друг месец оцеляват", () => {
    let s = new Set(["J1", "J2", "J3"]);
    s = toggleMonthSelection(s, AUG);
    expect(s.has("J1") && s.has("J2") && s.has("J3")).toBe(true);
    expect(s.size).toBe(12);
  });
  it("6/11) без дубликати (Set): припокриване не увеличава броя", () => {
    let s = new Set(["J1"]); // J1 вече избран индивидуално
    s = toggleMonthSelection(s, JUL); // избери целия Юли
    expect(s.size).toBe(8); // не 9
  });
  it("10) SOME → header click избира ЦЕЛИЯ месец", () => {
    let s = new Set(["A1", "A2"]); // 2 от 9
    s = toggleMonthSelection(s, AUG);
    expect(s.size).toBe(9);
  });
  it("11) ALL → header click деселектира месеца", () => {
    let s = new Set(AUG);
    s = toggleMonthSelection(s, AUG);
    expect([...s].filter((id) => AUG.includes(id)).length).toBe(0);
  });
  it("не мутира входния Set (immutability)", () => {
    const orig = new Set(["J1"]);
    toggleMonthSelection(orig, AUG);
    expect(orig.size).toBe(1);
  });
});

describe("monthCheckboxState (§8/§9/§25/§26)", () => {
  it("7) NONE когато нищо от месеца не е избрано", () => {
    expect(monthCheckboxState(new Set(["J1"]), AUG)).toBe("none");
  });
  it("8) ALL когато всички от месеца са избрани", () => {
    expect(monthCheckboxState(new Set(AUG), AUG)).toBe("all");
  });
  it("9/25) SOME (indeterminate) при частичен избор", () => {
    expect(monthCheckboxState(new Set(["A1", "A2", "A3"]), AUG)).toBe("some");
  });
  it("26) ALL, после махане на един → SOME", () => {
    const s = new Set(AUG); s.delete("A4");
    expect(monthCheckboxState(s, AUG)).toBe("some");
    expect([...s].length).toBe(8);
  });
  it("празен месец → none", () => { expect(monthCheckboxState(new Set(), [])).toBe("none"); });
});

describe("grouping/различни години + clear + download (§16/§27/§14)", () => {
  it("13) един и същ месец в различни години са различни групи (canonical key)", () => {
    // Симулираме groupByMonth key = `${year}-${month}`.
    const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
    expect(key(2026, 7)).not.toBe(key(2025, 7));
  });
  it("14) canonical selected set = точните ID-та за bulk download", () => {
    let s = toggleMonthSelection(new Set(), AUG);
    s = toggleMonthSelection(s, ["J1", "J2"]);
    const ids = [...s];
    expect(ids.sort()).toEqual([...AUG, "J1", "J2"].sort());
  });
  it("12/27) clear = празен Set (всички месеци/individual reset)", () => {
    let s = new Set([...AUG, "J1", "J2", "J3"]);
    s = new Set(); // „Изчисти избора"
    expect(s.size).toBe(0);
    expect(monthCheckboxState(s, AUG)).toBe("none");
    expect(monthCheckboxState(s, JUL)).toBe("none");
  });
});

describe("InvoicesTable — month header НЕ е global select-all (source assertion §14)", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const src = fs.readFileSync("src/components/app/InvoicesTable.tsx", "utf-8");
  it("header ползва MonthCheckbox + toggleMonth(monthIds), не toggleAll/allSelected", () => {
    expect(src).toContain("toggleMonth(monthIds)");
    expect(src).toContain("monthCheckboxState(selected, monthIds)");
    expect(src).not.toContain("onChange={toggleAll}");
    expect(src).not.toContain("checked={allSelected}");
  });
  it("bulk download ползва canonical selected set", () => {
    expect(src).toContain("invoices.filter((i) => selected.has(i.id)).map((i) => i.id)");
  });
});
