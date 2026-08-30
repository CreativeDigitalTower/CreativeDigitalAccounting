import { describe, it, expect } from "vitest";
import { buildVehicleDeliveryMatch, countGeneratedDocs } from "@/lib/logistics/vehicleDeliveries";

describe("vehicle delivery match (30/31/55)", () => {
  it("primary match is always truckVehicleId", () => {
    const m = buildVehicleDeliveryMatch("veh1", []);
    expect(m.OR[0]).toEqual({ truckVehicleId: "veh1" });
  });
  it("adds legacy reg fallback only for records without truckVehicleId", () => {
    const m = buildVehicleDeliveryMatch("veh1", ["SK501TO", "SK-501-TO"]);
    expect(m.OR).toContainEqual({ truckVehicleId: null, truckRegSnapshot: { in: ["SK501TO", "SK-501-TO"] } });
  });
  it("no reg variants -> no ambiguous fallback (skip)", () => {
    const m = buildVehicleDeliveryMatch("veh1", [null, "", undefined]);
    expect(m.OR.length).toBe(1);
    expect(m.OR[0]).toEqual({ truckVehicleId: "veh1" });
  });
  it("dedupes reg variants", () => {
    const m = buildVehicleDeliveryMatch("veh1", ["SK501TO", "SK501TO"]);
    const fallback = m.OR.find((c) => "truckRegSnapshot" in c) as { truckRegSnapshot: { in: string[] } };
    expect(fallback.truckRegSnapshot.in).toEqual(["SK501TO"]);
  });
});

describe("generated document count (14/38)", () => {
  it("counts only active generated types (no cmr_epson/blank)", () => {
    expect(countGeneratedDocs(["invoice", "dispatch", "declaration", "cmr_hp"])).toBe(4);
    expect(countGeneratedDocs(["invoice", "cmr_epson", "blank"])).toBe(1);
    expect(countGeneratedDocs([])).toBe(0);
  });
});
