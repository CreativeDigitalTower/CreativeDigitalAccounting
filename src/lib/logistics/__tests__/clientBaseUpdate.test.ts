import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { planClientUpdate, normEikMk, type ExistingClient } from "@/lib/logistics/clientBaseUpdate";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const DATASET = JSON.parse(read("scripts/data/logistics-client-bases.json")) as Record<string, any>[];
const byKey = (k: string) => DATASET.find((e) => e.key === k)!;
const ex = (o: Partial<ExistingClient> & { id: string }): ExistingClient => ({ name: "", eik: null, address: null, baseAddress: null, city: null, country: null, ...o });

describe("Dataset integrity", () => {
  it("14 записа; ключови стойности", () => {
    expect(DATASET).toHaveLength(14);
    expect(byKey("aradiko").eik).toBe("4069010500430");
    expect(byKey("kalina").eik).toBe("401300011340"); // точно както е подадено (§9)
    expect(byKey("bau").eik).toBeNull();
    expect(byKey("bau").mb).toBe("5756464");
    expect(byKey("gradis-koo").baseAddress).toBeNull();
    expect(byKey("dine-trejd").eik).toBeNull();
  });
});

describe("Matching (§2)", () => {
  it("1) match по ЕДБ", () => {
    const p = planClientUpdate(byKey("aradiko") as any, [ex({ id: "sem_a", name: "ARADIKO KOP DOOEL", eik: "4069010500430" })]);
    expect(p.matchReason).toBe("EIK");
    expect(p.clientId).toBe("sem_a");
  });
  it("8) MK префикс се нормализира при match", () => {
    expect(normEikMk("MK 4069010500430")).toBe("4069010500430");
    const p = planClientUpdate(byKey("aradiko") as any, [ex({ id: "x", name: "ARADIKO", eik: "MK4069010500430" })]);
    expect(p.clientId).toBe("x");
  });
  it("2/9) ДИНЕ ТРЕJД (без ЕДБ) match по нормализирано име към ДИНЕ-ТРЕJД", () => {
    const p = planClientUpdate(byKey("dine-trejd") as any, [ex({ id: "sem_dine", name: "ДИНЕ-ТРЕJД ДОО", eik: "4015001103344" })]);
    expect(p.matchReason).toBe("name");
    expect(p.clientId).toBe("sem_dine");
    // не се пипа съществуващият ЕДБ (подаденият е null)
    expect(p.changes.find((c) => c.field === "eik")).toBeUndefined();
  });
  it("ДМ ПРЕЦИЗ ↔ ДМ-ПРЕЦИЗ по ЕДБ", () => {
    const p = planClientUpdate(byKey("dm-preciz") as any, [ex({ id: "sem_dm", name: "ДМ-ПРЕЦИЗ ДОО", eik: "4029998115950" })]);
    expect(p.matchReason).toBe("EIK");
    expect(p.clientId).toBe("sem_dm");
  });
  it("10) ambiguous (два записа със същия ЕДБ) → не се създава/променя", () => {
    const p = planClientUpdate(byKey("mak-bet") as any, [
      ex({ id: "a", name: "МАК-БЕТ ДОО", eik: "4030991189794" }),
      ex({ id: "b", name: "MAK BET", eik: "4030991189794" }),
    ]);
    expect(p.action).toBe("AMBIGUOUS");
    expect(p.clientId).toBeNull();
  });
});

describe("Update / create / idempotency", () => {
  it("3/5/6) update допълва адрес на регистрация и база (отделни полета)", () => {
    const p = planClientUpdate(byKey("dpgu-beton") as any, [ex({ id: "sem_dpgu", name: "ДПГУ БЕТОН ГРАДБА ДООЕЛ", eik: "4017010513779" })]);
    expect(p.action).toBe("UPDATE");
    const fields = p.changes.map((c) => c.field);
    expect(fields).toContain("address");
    expect(fields).toContain("baseAddress");
    expect(p.changes.find((c) => c.field === "address")!.to).toContain("Билановска");
    expect(p.changes.find((c) => c.field === "baseAddress")!.to).toBe("Куманово");
  });
  it("4/13) липсващ клиент → CREATE (под SEM в скрипта)", () => {
    const p = planClientUpdate(byKey("jovanov") as any, []);
    expect(p.action).toBe("CREATE");
    expect(p.matchReason).toBe("NEW");
  });
  it("7) null baseAddress не влиза като промяна при CREATE", () => {
    const p = planClientUpdate(byKey("gradis-koo") as any, []);
    expect(p.changes.find((c) => c.field === "baseAddress")).toBeUndefined();
  });
  it("9-bau) M.B. не се третира като ЕДБ — само note", () => {
    const p = planClientUpdate(byKey("bau") as any, []);
    expect(p.changes.find((c) => c.field === "eik")).toBeUndefined();
    expect(p.notes.join(" ")).toContain("5756464");
  });
  it("11) идемпотентност: втори път върху вече обновен запис → NO_CHANGE", () => {
    const e = byKey("boni") as any;
    const applied = ex({ id: "sem_boni", name: "БОНИ ИНТЕРГРАДБА ДОО", eik: e.eik, address: e.regAddress, baseAddress: e.baseAddress, city: e.city, country: e.country });
    const p = planClientUpdate(e, [applied]);
    expect(p.action).toBe("NO_CHANGE");
    expect(p.changes).toHaveLength(0);
  });
  it("CONFLICT: различен непразен ЕДБ не се презаписва (§8/§9)", () => {
    const p = planClientUpdate(byKey("kalina") as any, [ex({ id: "sem_k", name: "КАЛИНА ДООЕЛ", eik: "9999999999999" })]);
    expect(p.action).toBe("CONFLICT");
    expect(p.changes.find((c) => c.field === "eik")).toBeUndefined();
    expect(p.conflicts.join(" ")).toContain("ЕДБ");
  });
});

describe("Script safeguards (§9/§11/§12/§3)", () => {
  const s = read("scripts/update-logistics-client-bases.mjs");
  it("12) създава под SEM companyId; dry-run по подразбиране", () => {
    expect(s).toContain("companyId: sem.id");
    expect(s).toMatch(/APPLY = process\.argv\.includes\("--apply"\)/);
  });
  it("12) duplicate guard преди create", () => {
    expect(s).toContain("пропуснат create");
  });
  it("3) не пипа snapshots / други модули", () => {
    expect(s).not.toMatch(/Snapshot|exportDocumentSet|updateMany/);
  });
});
