import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { CANONICAL_FLEET, planFleetReconcile, type ExistingVehicle } from "@/lib/logistics/fleetReconcile";
import { normalizeRegistration } from "@/lib/logistics/normalize";

const read = (p: string) => fs.readFileSync(p, "utf-8");

const ex = (p: Partial<ExistingVehicle> & { registration: string }): ExistingVehicle => ({
  id: p.id ?? "v_" + p.registration, registration: p.registration, normalizedRegistration: normalizeRegistration(p.registration),
  active: p.active ?? true, trailer: p.trailer ?? null, carrierName: p.carrierName ?? null, driver: p.driver ?? null, capacity: p.capacity ?? null,
});

describe("CANONICAL_FLEET (Excel source of truth)", () => {
  it("съдържа точно 41 композиции", () => { expect(CANONICAL_FLEET.length).toBe(41); });
  it("разпределение по превозвачи: 8/4/11/3/1/3/11", () => {
    const by: Record<string, number> = {};
    for (const c of CANONICAL_FLEET) by[c.carrier] = (by[c.carrier] ?? 0) + 1;
    expect(by).toEqual({ "ТргоМетал": 8, "Гриц": 4, "Trans": 11, "Ископ": 3, "Tanigo Sped": 1, "ДАЦ-МИ": 3, "Торби": 11 });
  });
  it("без дубли по нормализиран регистрационен номер (Latin/Cyrillic)", () => {
    const keys = CANONICAL_FLEET.map((c) => normalizeRegistration(c.truck));
    expect(new Set(keys).size).toBe(41);
  });
});

describe("planFleetReconcile — actions (§7/§15/§20)", () => {
  it("празна DB → всички 41 CREATE, finalActive=41", () => {
    const plan = planFleetReconcile([]);
    expect(plan.summary.CREATE).toBe(41);
    expect(plan.summary.finalActive).toBe(41);
    expect(plan.summary.DEACTIVATE).toBe(0);
  });
  it("съществуващ активен, съвпадащ → KEEP_ACTIVE", () => {
    const plan = planFleetReconcile([ex({ registration: "SK3362AB", trailer: "SK939TH", carrierName: "ТргоМетал", driver: "Сашо Митковски", capacity: 26.5 })]);
    const row = plan.rows.find((r) => r.truck === "SK3362AB")!;
    expect(row.action).toBe("KEEP_ACTIVE");
  });
  it("Latin/Cyrillic: DB латиница SK501TO ↔ Excel кирилица SK501TО → KEEP (без дубъл/CREATE)", () => {
    const plan = planFleetReconcile([ex({ registration: "SK501TO", trailer: "SK5022AE", carrierName: "ТргоМетал", driver: "Борис Николовски", capacity: 26.5 })]);
    const skopie = plan.rows.filter((r) => normalizeRegistration(r.truck) === normalizeRegistration("SK501TО"));
    expect(skopie.length).toBe(1);
    expect(skopie[0].action).toBe("KEEP_ACTIVE");
  });
  it("неактивен в Excel → ACTIVATE (не CREATE)", () => {
    const plan = planFleetReconcile([ex({ registration: "SK832UU", active: false, trailer: "SK5021AE", carrierName: "ТргоМетал", driver: "Лазе Стефковски" })]);
    expect(plan.rows.find((r) => r.truck === "SK832UU")!.action).toBe("ACTIVATE");
  });
  it("активен но различен шофьор/ремарке → UPDATE", () => {
    const plan = planFleetReconcile([ex({ registration: "SK3362AB", trailer: "OLDTR", carrierName: "ТргоМетал", driver: "Стар Шофьор", capacity: 26.5 })]);
    const row = plan.rows.find((r) => r.truck === "SK3362AB")!;
    expect(row.action).toBe("UPDATE");
    expect(row.notes).toContain("ремарке");
    expect(row.notes).toContain("шофьор");
  });
  it("активен, който НЕ е в Excel → DEACTIVATE (без триене)", () => {
    const plan = planFleetReconcile([ex({ registration: "OLD999XX", active: true, carrierName: "СтарПревоз" })]);
    const row = plan.rows.find((r) => r.truck === "OLD999XX")!;
    expect(row.action).toBe("DEACTIVATE");
  });
  it("§15: празен капацитет в Excel не води до UPDATE само заради капацитет", () => {
    // SK832UU в Excel е с capacity null → дори DB да има 30, не тригерва diff по капацитет.
    const plan = planFleetReconcile([ex({ registration: "SK832UU", trailer: "SK5021AE", carrierName: "ТргоМетал", driver: "Лазе Стефковски", capacity: 30 })]);
    expect(plan.rows.find((r) => r.truck === "SK832UU")!.action).toBe("KEEP_ACTIVE");
  });
  it("реалистично: 41 активни + 1 стар → finalActive=41, DEACTIVATE=1", () => {
    const existing = CANONICAL_FLEET.map((c) => ex({ registration: c.truck, trailer: c.trailer, carrierName: c.carrier, driver: c.driver, capacity: c.capacity }));
    existing.push(ex({ registration: "ZZ0000ZZ", active: true }));
    const plan = planFleetReconcile(existing);
    expect(plan.summary.finalActive).toBe(41);
    expect(plan.summary.DEACTIVATE).toBe(1);
    expect(plan.summary.CREATE).toBe(0);
  });
});

describe("vehicle selector + inactive безопасност (§9/§10) — source assertions", () => {
  const form = read("src/components/app/logistics/ExportSetForm.tsx");
  const newPage = read("src/app/(app)/dashboard/logistics/export/new/page.tsx");
  const editPage = read("src/app/(app)/dashboard/logistics/export/[id]/edit/page.tsx");
  it("selector-ът показва превозвач + шофьор в етикета (searchable)", () => {
    expect(form).toContain("v.carrier ? ` · ${v.carrier}`");
    expect(form).toContain("v.driver ? ` · ${v.driver}`");
  });
  it("нова доставка зарежда САМО active автомобили + carrier/driver", () => {
    expect(newPage).toContain("active: true");
    expect(newPage).toContain("carrier: { select: { name: true } }");
    expect(newPage).toContain("defaultDriver: true");
  });
  it("редакция запазва вече ДЕАКТИВИРАНИЯ автомобил на старата доставка (§9)", () => {
    expect(editPage).toContain("set.truckVehicleId && !vehicles.some");
    expect(editPage).toContain("vehicleOptions = [...vehicles, inactive]");
  });
  it("dropdown зависи от Vehicle.active (историческите snapshots не се пипат, §5)", () => {
    // export set пази truckRegSnapshot/trailerReg → master update не rewrite-ва историята.
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/truckRegSnapshot\s+String\?/);
    expect(schema).toMatch(/model Vehicle[\s\S]*?active\s+Boolean\s+@default\(true\)/);
  });
});
