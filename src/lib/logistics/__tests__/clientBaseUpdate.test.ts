import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { planClientUpdate, normEikMk, type ExistingClient } from "@/lib/logistics/clientBaseUpdate";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const DATASET = JSON.parse(read("scripts/data/logistics-client-bases.json")) as Record<string, any>[];
const byKey = (k: string) => DATASET.find((e) => e.key === k)!;
const ex = (o: Partial<ExistingClient> & { id: string }): ExistingClient => ({ name: "", eik: null, address: null, baseAddress: null, city: null, country: null, ...o });
const fieldsOf = (p: ReturnType<typeof planClientUpdate>) => p.changes.map((c) => c.field);

describe("Dataset integrity", () => {
  it("14 записа; ключови стойности", () => {
    expect(DATASET).toHaveLength(14);
    expect(byKey("kalina").eik).toBe("401300011340");
    expect(byKey("bau").mb).toBe("5756464");
    expect(byKey("gradis-koo").baseAddress).toBeNull();
    expect(byKey("dine-trejd").eik).toBeNull();
  });
});

describe("Matching (§2/§8)", () => {
  it("match по ЕДБ + MK нормализация", () => {
    expect(normEikMk("MK 4069010500430")).toBe("4069010500430");
    const p = planClientUpdate(byKey("aradiko") as any, [ex({ id: "x", name: "ARADIKO", eik: "MK4069010500430" })]);
    expect(p.clientId).toBe("x");
    expect(p.matchReason).toBe("EIK");
  });
  it("ДИНЕ ТРЕJД (без ЕДБ) match по нормализирано име", () => {
    const p = planClientUpdate(byKey("dine-trejd") as any, [ex({ id: "d", name: "ДИНЕ-ТРЕJД ДОО", eik: "4015001103344" })]);
    expect(p.clientId).toBe("d");
    expect(p.matchReason).toBe("name");
  });
  it("ambiguous → без промяна/create", () => {
    const p = planClientUpdate(byKey("mak-bet") as any, [ex({ id: "a", name: "МАК-БЕТ ДОО", eik: "4030991189794" }), ex({ id: "b", name: "X", eik: "4030991189794" })]);
    expect(p.action).toBe("AMBIGUOUS");
    expect(p.clientId).toBeNull();
  });
});

describe("Existing client update policy (§1/§2/§5/§6/§9)", () => {
  it("1) подробен registration address НЕ се презаписва от по-кратък подаден (ДМ ПРЕЦИЗ)", () => {
    const p = planClientUpdate(byKey("dm-preciz") as any, [ex({ id: "dm", name: "ДМ-ПРЕЦИЗ ДОО", eik: "4029998115950", address: "Индустриска зона Македонка бр.18 ШТИП", baseAddress: null, city: "Штип" })]);
    expect(fieldsOf(p)).not.toContain("address");            // не се пипа
    expect(fieldsOf(p)).toContain("baseAddress");             // само базата
    expect(p.changes.find((c) => c.field === "baseAddress")!.to).toBe("ШТИП, ул.Балканска бр.98");
    expect(p.warnings.join(" ")).toMatch(/registration address differs/);
    expect(p.action).toBe("BASE_ADDRESS_UPDATE");
    expect(p.manualReview).toBe(true);
  });
  it("2/3) съществуващ city НЕ се презаписва; GRADIS registration запазен, base остава null", () => {
    const p = planClientUpdate(byKey("gradis-koo") as any, [ex({ id: "g", name: "GRADIS-KOO DOOEL", address: "Nikushtak, Lipkovo", city: "Kumanovo", country: "Северна Македония" })]);
    expect(fieldsOf(p)).not.toContain("address");
    expect(fieldsOf(p)).not.toContain("city");
    expect(fieldsOf(p)).not.toContain("baseAddress"); // target null → няма промяна (§3)
    expect(p.action).toBe("NO_CHANGE");
    expect(p.warnings.join(" ")).toMatch(/registration address differs/);
  });
  it("3-name) име НЕ се преименува (само warning при различно нормализирано)", () => {
    const p = planClientUpdate({ key: "x", name: "ARADIKO KOMPANI DOOEL", eik: "4069010500430", regAddress: null, baseAddress: "Base X" } as any, [ex({ id: "a", name: "ARADIKO KOP DOOEL", eik: "4069010500430" })]);
    expect(fieldsOf(p)).not.toContain("name");
    expect(p.warnings.join(" ")).toMatch(/name differs/);
  });
  it("4/5) EIK conflict → warning (MANUAL_REVIEW) но НЕ блокира baseAddress; EIK/city непроменени (КАЛИНА)", () => {
    const p = planClientUpdate(byKey("kalina") as any, [ex({ id: "k", name: "КАЛИНА ДООЕЛ", eik: "4013000111340", baseAddress: null })]);
    expect(fieldsOf(p)).toEqual(["baseAddress"]);             // САМО baseAddress
    expect(p.changes[0].to).toBe("Кочани");
    expect(p.warnings.join(" ")).toMatch(/EIK differs/);
    expect(p.manualReview).toBe(true);
    expect(p.action).toBe("BASE_ADDRESS_UPDATE");
  });
  it("6) baseAddress се обновява от подадения авторитетен списък", () => {
    const p = planClientUpdate(byKey("mak-bet") as any, [ex({ id: "m", name: "МАК-БЕТ ДОО", eik: "4030991189794", baseAddress: "стар" })]);
    expect(p.changes.find((c) => c.field === "baseAddress")!.to).toBe("Визбегово, Бутел, Скопje");
  });
  it("§1/§9) съществуващ клиент → update payload САМО baseAddress (никакви fills)", () => {
    // празни city/address/eik → НЕ се попълват в този batch
    const p = planClientUpdate(byKey("boni") as any, [ex({ id: "b", name: "БОНИ ИНТЕРГРАДБА ДОО" })]);
    expect(fieldsOf(p)).toEqual(["baseAddress"]);
    expect(fieldsOf(p)).not.toContain("address");
    expect(fieldsOf(p)).not.toContain("city");
    expect(fieldsOf(p)).not.toContain("eik");
    expect(fieldsOf(p)).not.toContain("country");
  });
  it("§10.1) празен city НЕ се попълва дори когато е подаден", () => {
    const p = planClientUpdate(byKey("dac-mi") as any, [ex({ id: "d", name: "ДАЦ-МИ ТРАНС ДООЕЛ ШТИП", eik: "4029004128810", city: null })]);
    expect(fieldsOf(p)).not.toContain("city");
    expect(fieldsOf(p)).toContain("baseAddress");
  });
});

describe("Create + idempotency (§7/§10/§11)", () => {
  it("7) липсващ клиент → CREATE с пълни данни", () => {
    const p = planClientUpdate(byKey("jovanov") as any, []);
    expect(p.action).toBe("CREATE");
    expect(fieldsOf(p)).toEqual(expect.arrayContaining(["name", "address", "baseAddress", "city", "country"]));
  });
  it("8) GRADIS baseAddress остава null при CREATE", () => {
    const p = planClientUpdate(byKey("gradis-koo") as any, []);
    expect(fieldsOf(p)).not.toContain("baseAddress");
  });
  it("9) BAU M.B. не се третира като ЕДБ — само note", () => {
    const p = planClientUpdate(byKey("bau") as any, []);
    expect(fieldsOf(p)).not.toContain("eik");
    expect(p.notes.join(" ")).toContain("5756464");
  });
  it("10) идемпотентност: втори път след базовия ъпдейт → NO_CHANGE", () => {
    const e = byKey("dpgu-beton") as any;
    const applied = ex({ id: "d", name: "ДПГУ БЕТОН ГРАДБА ДООЕЛ", eik: e.eik, address: "нещо съществуващо", baseAddress: e.baseAddress, city: "Куманово", country: e.country });
    const p = planClientUpdate(e, [applied]);
    expect(p.action).toBe("NO_CHANGE");
    expect(p.changes).toHaveLength(0);
  });
});

describe("Script safeguards (§7/§12/§13)", () => {
  const s = read("scripts/update-logistics-client-bases.mjs");
  it("създава под SEM; dry-run по подразбиране; duplicate guard", () => {
    expect(s).toContain("companyId: sem.id");
    expect(s).toMatch(/APPLY = process\.argv\.includes\("--apply"\)/);
    expect(s).toContain("пропуснат create");
  });
  it("съществуващ клиент → само baseAddress write (никакви fills на city/address/eik/country)", () => {
    // единственият push в existing-клона е baseAddress; останалите са warnings
    expect(s).toMatch(/changes\.push\(\["baseAddress"/);
    expect(s).not.toMatch(/changes\.push\(\["city"/);
    expect(s).not.toMatch(/changes\.push\(\["address"/);
    expect(s).not.toMatch(/changes\.push\(\["country"/);
    expect(s).toContain("BASE_ADDRESS_UPDATE");
    expect(s).not.toMatch(/Snapshot|exportDocumentSet|updateMany/);
  });
  it("новите action етикети + WARNINGS в изхода", () => {
    expect(s).toContain("MANUAL_REVIEW");
    expect(s).toContain("WARNINGS");
  });
});
