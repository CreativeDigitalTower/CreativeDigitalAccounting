import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { resolvePeriod, aggregateCarrierOverview, aggregateCarrierDetail, type CarrierLite, type VehicleCarrier, type TripAgg, type DeliveryRow } from "@/lib/logistics/carrierAnalytics";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("resolvePeriod (§2)", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  it("current_month → септември 2026", () => {
    const r = resolvePeriod("current_month", null, null, now)!;
    expect(r.gte.getFullYear()).toBe(2026); expect(r.gte.getMonth()).toBe(8); expect(r.lt.getMonth()).toBe(9);
  });
  it("last_3m → юли..октомври (3 месеца назад до края на текущия)", () => {
    const r = resolvePeriod("last_3m", null, null, now)!;
    expect(r.gte.getMonth()).toBe(6); // юли
  });
  it("all → null (без филтър)", () => { expect(resolvePeriod("all", null, null, now)).toBeNull(); });
  it("custom → from/to", () => {
    const r = resolvePeriod("custom", "2026-01-01", "2026-03-31", now)!;
    expect(r.gte.getFullYear()).toBe(2026);
  });
});

describe("aggregateCarrierOverview (§1/§13/§18) — rollup без double counting", () => {
  const carriers: CarrierLite[] = [
    { id: "c1", name: "ТргоМетал", active: true }, { id: "c2", name: "Trans", active: true }, { id: "c3", name: "Стар", active: false },
  ];
  const vehicles: VehicleCarrier[] = [
    { vehicleId: "v1", carrierId: "c1", active: true }, { vehicleId: "v2", carrierId: "c1", active: true }, { vehicleId: "v3", carrierId: "c1", active: false },
    { vehicleId: "v4", carrierId: "c2", active: true }, { vehicleId: "v5", carrierId: null, active: true },
  ];
  // ЕДИН превоз = ЕДИН ExportDocumentSet → groupBy по автомобил вече е дедупликиран.
  const trips: TripAgg[] = [
    { truckVehicleId: "v1", trips: 10, quantity: 260, lastDelivery: "2026-09-10T00:00:00.000Z" },
    { truckVehicleId: "v2", trips: 5, quantity: 130, lastDelivery: "2026-09-12T00:00:00.000Z" },
    { truckVehicleId: "v4", trips: 8, quantity: 200, lastDelivery: "2026-09-01T00:00:00.000Z" },
    { truckVehicleId: "v5", trips: 3, quantity: 50, lastDelivery: "2026-08-01T00:00:00.000Z" }, // без carrier → не се брои
  ];
  const ov = aggregateCarrierOverview(carriers, vehicles, trips);
  it("ТргоМетал = сбор от v1+v2 (15 превоза, 390 t); последен = 12.09", () => {
    const c1 = ov.rows.find((r) => r.id === "c1")!;
    expect(c1.trips).toBe(15); expect(c1.quantity).toBe(390);
    expect(c1.vehiclesActive).toBe(2); expect(c1.vehiclesTotal).toBe(3);
    expect(c1.lastDelivery).toBe("2026-09-12T00:00:00.000Z");
  });
  it("KPI: активни превозвачи, активни автомобили, top", () => {
    expect(ov.kpi.totalCarriers).toBe(3);
    expect(ov.kpi.activeCarriers).toBe(2);
    expect(ov.kpi.activeVehicles).toBe(4); // v1,v2,v4,v5 (всички active; v3 не е)
    expect(ov.kpi.totalTrips).toBe(23); // 15 + 8 (v5 без carrier не влиза)
    expect(ov.kpi.totalQuantity).toBe(590);
    expect(ov.kpi.topCarrierId).toBe("c1");
  });
  it("превоз на автомобил без carrier не се приписва на никого", () => {
    const total = ov.rows.reduce((s, r) => s + r.trips, 0);
    expect(total).toBe(23); // v5 (3) изключен
  });
  it("превозвач с нула доставки → 0 (не се чупи)", () => {
    const c3 = ov.rows.find((r) => r.id === "c3")!;
    expect(c3.trips).toBe(0); expect(c3.quantity).toBe(0); expect(c3.lastDelivery).toBeNull();
  });
});

describe("aggregateCarrierDetail (§5/§8/§9/§10/§12)", () => {
  const now = new Date("2026-09-15T00:00:00Z");
  const rows: DeliveryRow[] = [
    { id: "a", shipmentDate: "2026-09-01", truckVehicleId: "v1", truckReg: "SK501TO", trailer: "SK5022AE", destination: "Skopie", destKey: "skopie", product: "CEM I", quantity: 26, status: "finalized" },
    { id: "b", shipmentDate: "2026-09-10", truckVehicleId: "v1", truckReg: "SK501TO", trailer: "SK5022AE", destination: "Skopie", destKey: "skopie", product: "CEM I", quantity: 24, status: "finalized" },
    { id: "c", shipmentDate: "2026-03-05", truckVehicleId: "v2", truckReg: "SK498SL", trailer: "SK5020AE", destination: "Kochani", destKey: "kochani", product: "CEM II", quantity: 20, status: "draft" },
  ];
  const s = aggregateCarrierDetail(rows, now);
  it("total trips/quantity/avg", () => {
    expect(s.totalTrips).toBe(3); expect(s.totalQuantity).toBe(70); expect(s.avgQuantity).toBeCloseTo(23.333, 2);
  });
  it("this month / first / last / max / distinct", () => {
    expect(s.tripsThisMonth).toBe(2); expect(s.quantityThisMonth).toBe(50);
    expect(s.firstDeliveryAt).toBe(new Date("2026-03-05").toISOString());
    expect(s.lastDeliveryAt).toBe(new Date("2026-09-10").toISOString());
    expect(s.maxTripQuantity).toBe(26); expect(s.distinctVehicles).toBe(2); expect(s.distinctDestinations).toBe(2);
  });
  it("byVehicle: v1 = 2 превоза / 50 t", () => {
    const v1 = s.byVehicle.find((v) => v.vehicleId === "v1")!;
    expect(v1.trips).toBe(2); expect(v1.quantity).toBe(50); expect(v1.truckReg).toBe("SK501TO");
  });
  it("byDestination: Skopie 2/50, Kochani 1/20", () => {
    expect(s.byDestination[0]).toEqual({ destination: "Skopie", trips: 2, quantity: 50 });
  });
  it("byMonth: 2026-09 = 2 превоза / 50 t (newest first)", () => {
    expect(s.byMonth[0]).toEqual({ month: "2026-09", trips: 2, quantity: 50 });
  });
  it("празни доставки → нули", () => {
    const e = aggregateCarrierDetail([], now);
    expect(e.totalTrips).toBe(0); expect(e.firstDeliveryAt).toBeNull();
  });
});

describe("company scoping + canonical source (§16/§18) — API source assertions", () => {
  const listApi = read("src/app/api/logistics/carriers/route.ts");
  const detailApi = read("src/app/api/logistics/carriers/[id]/route.ts");
  const delApi = read("src/app/api/logistics/carriers/[id]/deliveries/route.ts");
  it("всички заявки са company-scoped (companyId)", () => {
    for (const s of [listApi, detailApi, delApi]) expect(s).toContain("companyId: g.companyId");
  });
  it("detail/deliveries имат IDOR guard (findFirst по id+companyId, 404)", () => {
    expect(detailApi).toContain('findFirst({ where: { id, companyId: g.companyId }');
    expect(delApi).toContain('findFirst({ where: { id, companyId: g.companyId }');
  });
  it("canonical = ExportDocumentSet, без trash (deletedAt: null); groupBy (без N+1)", () => {
    expect(listApi).toContain("exportDocumentSet.groupBy");
    expect(listApi).toContain("deletedAt: null");
  });
  it("използва pickPrimaryConfig за текущия капацитет (не произволна config)", () => {
    expect(detailApi).toContain("pickPrimaryConfig");
  });
})
