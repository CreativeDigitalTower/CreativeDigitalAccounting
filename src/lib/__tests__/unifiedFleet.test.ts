import { describe, it, expect } from "vitest";
import { buildFleetView, fleetGaps, bagsCalc, exceedsPayload, type FleetVehicleInput } from "@/lib/logistics/fleet";
import { normalizeRegistration } from "@/lib/logistics/normalize";

const cfg = (o: Partial<FleetVehicleInput["configs"][number]> = {}) => ({
  id: o.id ?? "c1", trailer: o.trailer ?? "SK5022AE", carrierName: o.carrierName ?? "Carrier X",
  driver: o.driver ?? "Ivan", driverPhone: o.driverPhone ?? "0888", cargoMode: o.cargoMode ?? "bulk",
  maxPayloadTons: o.maxPayloadTons ?? 24, active: o.active ?? true,
});
const veh = (o: Partial<FleetVehicleInput> = {}): FleetVehicleInput => ({
  id: o.id ?? "v1", registration: o.registration ?? "SK501TO", active: o.active ?? true,
  ownershipType: o.ownershipType ?? "own", aliases: o.aliases ?? [], configs: o.configs ?? [cfg()],
});

describe("Unified Fleet aggregation (Vehicle=master + configs)", () => {
  it("keeps one row per Vehicle (no duplication)", () => {
    const { rows } = buildFleetView([veh({ id: "a" }), veh({ id: "b" })], normalizeRegistration);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("total KPI equals number of vehicles", () => {
    const { kpi } = buildFleetView([veh(), veh({ id: "v2" }), veh({ id: "v3", active: false })], normalizeRegistration);
    expect(kpi.total).toBe(3);
    expect(kpi.active).toBe(2);
  });
  it("primary config prefers an active configuration", () => {
    const { rows } = buildFleetView([veh({ configs: [cfg({ id: "old", active: false, driver: "A" }), cfg({ id: "new", active: true, driver: "B" })] })], normalizeRegistration);
    expect(rows[0].driver).toBe("B");
  });
  it("primary falls back to first config when none active", () => {
    const { rows } = buildFleetView([veh({ configs: [cfg({ id: "x", active: false, driver: "Only" })] })], normalizeRegistration);
    expect(rows[0].driver).toBe("Only");
  });
  it("configCount and configs list preserve multiple trailers", () => {
    const { rows } = buildFleetView([veh({ configs: [cfg({ id: "1", trailer: "T1" }), cfg({ id: "2", trailer: "T2" })] })], normalizeRegistration);
    expect(rows[0].configCount).toBe(2);
    expect(rows[0].configs.map((c) => c.trailer)).toEqual(["T1", "T2"]);
  });
  it("BULK and BAGS KPI count configurations", () => {
    const { kpi } = buildFleetView([
      veh({ id: "a", configs: [cfg({ cargoMode: "bulk" }), cfg({ id: "c2", cargoMode: "bags" })] }),
      veh({ id: "b", configs: [cfg({ cargoMode: "bags" })] }),
    ], normalizeRegistration);
    expect(kpi.bulk).toBe(1);
    expect(kpi.bags).toBe(2);
  });
  it("vehicle without config is still visible and flagged missing", () => {
    const { rows, kpi } = buildFleetView([veh({ configs: [] })], normalizeRegistration);
    expect(rows.length).toBe(1);
    expect(rows[0].configCount).toBe(0);
    expect(rows[0].anyGaps).toBe(true);
    expect(kpi.missing).toBe(1);
  });
  it("missing KPI counts configs with gaps", () => {
    const { kpi } = buildFleetView([veh({ configs: [cfg({ driver: "" }), cfg({ id: "ok" })] })], normalizeRegistration);
    expect(kpi.missing).toBe(1);
  });
  it("ownershipType preserved on the row", () => {
    const { rows } = buildFleetView([veh({ ownershipType: "carrier" })], normalizeRegistration);
    expect(rows[0].ownershipType).toBe("carrier");
  });
  it("archived vehicle still surfaces (active=false) without loss", () => {
    const { rows } = buildFleetView([veh({ active: false })], normalizeRegistration);
    expect(rows[0].active).toBe(false);
    expect(rows.length).toBe(1);
  });
  it("search key folds cyrillic/latin registration + aliases", () => {
    const { rows } = buildFleetView([veh({ registration: "СК501ТО", aliases: ["SK-501-TO"] })], normalizeRegistration);
    expect(rows[0]._search).toContain(normalizeRegistration("SK501TO"));
  });
  it("gaps detects missing driver/trailer/cargo/payload", () => {
    expect(fleetGaps({ driver: "", trailer: "", cargoMode: "", maxPayloadTons: null }).sort()).toEqual(["cargo", "driver", "payload", "trailer"]);
    expect(fleetGaps({ driver: "X", trailer: "Y", cargoMode: "bulk", maxPayloadTons: 24 })).toEqual([]);
  });
  it("BAGS math unchanged: 17x56=952 -> 23.8t", () => {
    const b = bagsCalc(17, 56, 25);
    expect(b.totalBags).toBe(952);
    expect(b.totalTons).toBe(23.8);
  });
  it("payload check unchanged", () => {
    expect(exceedsPayload(26, 24)).toBe(true);
    expect(exceedsPayload(20, 24)).toBe(false);
    expect(exceedsPayload(20, null)).toBe(null);
  });
});
