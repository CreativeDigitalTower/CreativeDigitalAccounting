import { describe, it, expect } from "vitest";
import { classifyCargoByProduct, volumeByCargo, byProduct, byTruck, byCarrier, type ReportSet, type TruckMeta } from "@/lib/logistics/reports";

describe("classifyCargoByProduct", () => {
  it("classifies canonical bulk products", () => {
    expect(classifyCargoByProduct("CEM I 52.5 R")).toBe("bulk");
  });
  it("classifies canonical bags products", () => {
    expect(classifyCargoByProduct("CEM II / B-LL 42.5 R")).toBe("bags");
  });
  it("is spacing/slash insensitive (normalizeProductKey)", () => {
    expect(classifyCargoByProduct("CEM II/B-LL 42.5R")).toBe("bags");
  });
  it("returns empty for unknown products", () => {
    expect(classifyCargoByProduct("нещо друго")).toBe("");
    expect(classifyCargoByProduct(null)).toBe("");
  });
});

const sets: ReportSet[] = [
  { truckVehicleId: "v1", truckReg: "SK111AA", product: "CEM I 52.5 R", quantity: 26 },      // bulk
  { truckVehicleId: "v1", truckReg: "SK111AA", product: "CEM I 52.5 R", quantity: 24 },      // bulk
  { truckVehicleId: "v2", truckReg: "SK222BB", product: "CEM II 42.5 R", quantity: 23.8 },   // bags
  { truckVehicleId: null, truckReg: "SK333CC", product: "непознат", quantity: 10 },          // unknown
];
const meta = new Map<string, TruckMeta>([
  ["v1", { carrierName: "УНИК", maxPayloadTons: 26 }],
  ["v2", { carrierName: null, maxPayloadTons: 23.8 }],
]);

describe("volumeByCargo", () => {
  it("splits bulk vs bags vs unknown", () => {
    const v = volumeByCargo(sets);
    expect(v.bulk).toEqual({ totalTons: 50, deliveries: 2 });
    expect(v.bags).toEqual({ totalTons: 23.8, deliveries: 1 });
    expect(v.unknown).toEqual({ totalTons: 10, deliveries: 1 });
  });
});

describe("byProduct", () => {
  it("aggregates and sorts desc by tons", () => {
    const rows = byProduct(sets);
    expect(rows[0]).toEqual({ label: "CEM I 52.5 R", deliveries: 2, totalTons: 50 });
    expect(rows.find((r) => r.label === "CEM II 42.5 R")).toEqual({ label: "CEM II 42.5 R", deliveries: 1, totalTons: 23.8 });
  });
});

describe("byTruck", () => {
  it("computes avg + utilization vs max payload", () => {
    const rows = byTruck(sets, meta);
    const v1 = rows.find((r) => r.label === "SK111AA")!;
    expect(v1.deliveries).toBe(2);
    expect(v1.totalTons).toBe(50);
    expect(v1.avgTons).toBe(25);
    expect(v1.carrierName).toBe("УНИК");
    expect(v1.maxPayloadTons).toBe(26);
    expect(v1.utilizationPct).toBe(96); // 25/26 = 96%
  });
  it("utilization is null when max payload unknown", () => {
    const rows = byTruck([{ truckVehicleId: "v9", truckReg: "SK999ZZ", product: "x", quantity: 10 }], new Map());
    expect(rows[0].utilizationPct).toBeNull();
    expect(rows[0].maxPayloadTons).toBeNull();
  });
});

describe("byCarrier", () => {
  it("attributes trucks with a single carrier; others go to —", () => {
    const rows = byCarrier(sets, meta);
    const unik = rows.find((r) => r.label === "УНИК")!;
    expect(unik).toEqual({ label: "УНИК", deliveries: 2, totalTons: 50 });
    const unknown = rows.find((r) => r.label === "—")!;
    // v2 (carrierName null) + null-vehicle set → both "—"
    expect(unknown.deliveries).toBe(2);
    expect(unknown.totalTons).toBe(33.8);
  });
});
