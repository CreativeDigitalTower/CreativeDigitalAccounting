import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { CANONICAL_FLEET, planFleetReconcile, pickPrimaryConfig, readCapacityFromConfigs, type ExistingVehicle, type VehicleConfigLite } from "@/lib/logistics/fleetReconcile";
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
  it("selector: етикетът е САМО Камион / Ремарке; превозвач/шофьор са само в keywords (search)", () => {
    // Display label = регистрация [/ ремарке]; БЕЗ carrier/driver визуално.
    expect(form).toContain("label: `${v.registration}${v.trailerReg ? ` / ${v.trailerReg}` : \"\"}`");
    expect(form).not.toContain("` · ${v.carrier}`");
    expect(form).not.toContain("` · ${v.driver}`");
    // Търсене по превозвач/шофьор остава (keywords, не се визуализира).
    expect(form).toContain("keywords: [v.carrier, v.driver].filter(Boolean).join(\" \")");
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

describe("capacity idempotency (§ повторен apply → KEEP) — read/write от една primary config", () => {
  const exFrom = (reg: string, trailer: string | null, carrier: string, driver: string | null, configs: VehicleConfigLite[]) => {
    const trailerNorm = normalizeRegistration(trailer);
    return ex({ registration: reg, trailer, carrierName: carrier, driver, capacity: readCapacityFromConfigs(configs, trailerNorm) });
  };
  it("1-4) capacity различен → UPDATE; след apply (update на primary) → KEEP_ACTIVE", () => {
    // SK6539AO: Excel capacity 26. Primary config има 24 → трябва UPDATE.
    const c = CANONICAL_FLEET.find((x) => normalizeRegistration(x.truck) === normalizeRegistration("SK6539AO"))!;
    let configs: VehicleConfigLite[] = [{ id: "cfgA", maxPayloadTons: 24, active: true, createdAt: "2024-01-01", trailerRegNorm: normalizeRegistration(c.trailer) }];
    let plan1 = planFleetReconcile([exFrom(c.truck, c.trailer, c.carrier, c.driver, configs)]);
    const row1 = plan1.rows.find((r) => normalizeRegistration(r.truck) === normalizeRegistration("SK6539AO"))!;
    expect(row1.action).toBe("UPDATE");
    expect(row1.notes).toContain("капацитет");
    // apply симулация: пише в PRIMARY config (cfgA) → 26.
    const primary = pickPrimaryConfig(configs, normalizeRegistration(c.trailer))!;
    configs = configs.map((x) => x.id === primary.id ? { ...x, maxPayloadTons: c.capacity } : x);
    const plan2 = planFleetReconcile([exFrom(c.truck, c.trailer, c.carrier, c.driver, configs)]);
    expect(plan2.rows.find((r) => normalizeRegistration(r.truck) === normalizeRegistration("SK6539AO"))!.action).toBe("KEEP_ACTIVE");
  });
  it("възпроизвежда стария bug: 2 конфигурации → четенето и записът НЕ се разминават", () => {
    const c = CANONICAL_FLEET.find((x) => normalizeRegistration(x.truck) === normalizeRegistration("SK7503BV"))!;
    // Стара bulk config (24, по-стара) + нова празна config (26) — старият код четеше 24 (find non-null asc).
    const configs: VehicleConfigLite[] = [
      { id: "old", maxPayloadTons: 24, active: true, createdAt: "2023-01-01", trailerRegNorm: normalizeRegistration(c.trailer) },
      { id: "new", maxPayloadTons: 26.5, active: true, createdAt: "2025-06-01", trailerRegNorm: normalizeRegistration(c.trailer) },
    ];
    const primary = pickPrimaryConfig(configs, normalizeRegistration(c.trailer))!;
    // Четенето ползва СЪЩАТА primary, която apply би обновил → детерминизъм.
    const capRead = readCapacityFromConfigs(configs, normalizeRegistration(c.trailer));
    expect(capRead).toBe(primary.maxPayloadTons);
    // apply на primary → 26.5; повторно четене = 26.5 → KEEP.
    const after = configs.map((x) => x.id === primary.id ? { ...x, maxPayloadTons: c.capacity } : x);
    const plan = planFleetReconcile([exFrom(c.truck, c.trailer, c.carrier, c.driver, after)]);
    expect(plan.rows.find((r) => normalizeRegistration(r.truck) === normalizeRegistration("SK7503BV"))!.action).toBe("KEEP_ACTIVE");
  });
  it("pickPrimaryConfig: активна пред неактивна; съвпадащо ремарке; после най-стара", () => {
    const cfgs: VehicleConfigLite[] = [
      { id: "inactive_old", maxPayloadTons: 10, active: false, createdAt: "2020-01-01", trailerRegNorm: "T1" },
      { id: "active_match", maxPayloadTons: 26, active: true, createdAt: "2024-01-01", trailerRegNorm: "T1" },
      { id: "active_other", maxPayloadTons: 30, active: true, createdAt: "2022-01-01", trailerRegNorm: "T2" },
    ];
    expect(pickPrimaryConfig(cfgs, "T1")!.id).toBe("active_match");
  });
  it("37-те с празен Excel capacity остават KEEP независимо от DB (§15)", () => {
    // SK832UU: Excel capacity null → capacity никога не тригерва UPDATE.
    const c = CANONICAL_FLEET.find((x) => normalizeRegistration(x.truck) === normalizeRegistration("SK832UU"))!;
    expect(c.capacity).toBeNull();
    const configs: VehicleConfigLite[] = [{ id: "x", maxPayloadTons: 99, active: true, createdAt: "2024-01-01", trailerRegNorm: normalizeRegistration(c.trailer) }];
    const plan = planFleetReconcile([exFrom(c.truck, c.trailer, c.carrier, c.driver, configs)]);
    expect(plan.rows.find((r) => normalizeRegistration(r.truck) === normalizeRegistration("SK832UU"))!.action).toBe("KEEP_ACTIVE");
  });
});
