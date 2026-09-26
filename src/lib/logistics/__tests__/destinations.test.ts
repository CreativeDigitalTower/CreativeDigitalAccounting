import { describe, it, expect } from "vitest";
import {
  SEED_DESTINATION_RECORDS, INACTIVE_DESTINATION_NAMES, INACTIVE_NORMALIZED_KEYS,
  stripDeliveryTermSuffix, isInactiveDestinationName, aggregateDestinationDeliveries, maintainDestinations,
  type DeliveryRow,
} from "@/lib/logistics/destinations";
import { normalizeDestination } from "@/lib/logistics/deliveryTerms";
import { canLogistics, effectiveRole } from "@/lib/logistics/perms";

// ─────────── §20.1 / §20.3 / §20.4 — seed корекция ───────────
describe("seed destination records", () => {
  it("1) the 12 named destinations resolve to an inactive normalized key", () => {
    const twelve = ["Batinci", "Butel", "Dolno Konjari", "Gostivar", "Jakimovo", "Lipkovo", "Nikushtak", "Orizari", "Petrovac", "Rzanicino", "Vizbegovo", "Vraca"];
    for (const name of twelve) {
      expect(INACTIVE_NORMALIZED_KEYS.has(normalizeDestination(name))).toBe(true);
    }
  });
  it("3) Skopie is an active seed record with display name Skopie", () => {
    const sk = SEED_DESTINATION_RECORDS.find((r) => normalizeDestination(r.name) === "skopie");
    expect(sk?.active).toBe(true);
    expect(sk?.name).toBe("Skopie");
  });
  it("4) no seed display name contains FCA or a slash", () => {
    for (const r of SEED_DESTINATION_RECORDS) {
      expect(r.name.toUpperCase()).not.toContain("FCA");
      expect(r.name).not.toContain("/");
    }
  });
  it("inactive seed records are exactly the known spellings", () => {
    const inactive = SEED_DESTINATION_RECORDS.filter((r) => !r.active).map((r) => r.name);
    expect(inactive).toEqual(INACTIVE_DESTINATION_NAMES);
  });
});

// ─────────── §2 — Skopie / FCA SKOPIE cleanup ───────────
describe("stripDeliveryTermSuffix", () => {
  it("2) strips the delivery-term suffix to leave the destination name", () => {
    expect(stripDeliveryTermSuffix("Skopie / FCA SKOPIE")).toBe("Skopie");
  });
  it("keeps names without a separator intact (Kriva Palanka)", () => {
    expect(stripDeliveryTermSuffix("Kriva Palanka")).toBe("Kriva Palanka");
  });
  it("cleaned combined string normalizes to the Skopie key", () => {
    expect(normalizeDestination(stripDeliveryTermSuffix("Skopie / FCA SKOPIE"))).toBe(normalizeDestination("Skopie"));
  });
});

describe("isInactiveDestinationName", () => {
  it("recognizes an inactive destination regardless of spelling/suffix", () => {
    expect(isInactiveDestinationName("Gostivar")).toBe(true);
    expect(isInactiveDestinationName("Petrovec")).toBe(true);
    expect(isInactiveDestinationName("Skopie")).toBe(false);
  });
});

// ─────────── §20.10 / §20.11 — статистики decimal-safe ───────────
describe("aggregateDestinationDeliveries", () => {
  const now = new Date("2026-09-15T00:00:00Z");
  const rows: DeliveryRow[] = [
    { id: "a", shipmentDate: new Date("2026-09-01"), quantity: 25.1, unit: "t", productSnapshot: "CEM I 42.5 R", truckRegSnapshot: "SK1", invoiceNumber: "1" },
    { id: "b", shipmentDate: new Date("2026-09-10"), quantity: 24.2, unit: "t", productSnapshot: "CEM I 42.5 R", truckRegSnapshot: "SK1", invoiceNumber: "2" },
    { id: "c", shipmentDate: new Date("2026-03-05"), quantity: 10.05, unit: "t", productSnapshot: "CEM II 42.5 N", truckRegSnapshot: "SK2", invoiceNumber: "3" },
  ];
  it("10) count, total quantity and last delivery from the real records", () => {
    const s = aggregateDestinationDeliveries(rows, now);
    expect(s.totalDeliveries).toBe(3);
    expect(s.totalQuantity).toBe(59.35);
    expect(s.lastDeliveryAt).toBe(new Date("2026-09-10").toISOString());
  });
  it("11) decimal-safe summation (0.1 + 0.2 problem)", () => {
    const s = aggregateDestinationDeliveries([
      { id: "x", shipmentDate: now, quantity: 0.1, unit: "t", productSnapshot: null, truckRegSnapshot: null, invoiceNumber: null },
      { id: "y", shipmentDate: now, quantity: 0.2, unit: "t", productSnapshot: null, truckRegSnapshot: null, invoiceNumber: null },
    ], now);
    expect(s.totalQuantity).toBe(0.3);
  });
  it("month/year/avg + product breakdown + top truck", () => {
    const s = aggregateDestinationDeliveries(rows, now);
    expect(s.deliveriesThisMonth).toBe(2);
    expect(s.quantityThisMonth).toBe(49.3);
    expect(s.quantityThisYear).toBe(59.35);
    expect(s.topTruck).toBe("SK1");
    expect(s.distinctTrucks).toBe(2);
    expect(s.products[0]).toEqual({ name: "CEM I 42.5 R", quantity: 49.3 });
    expect(s.avgQuantity).toBeCloseTo(19.78, 2);
  });
});

// ─────────── §16 permissions ───────────
describe("permissions", () => {
  it("14) Super Admin technical access maps to owner (full access)", () => {
    expect(effectiveRole(true, null)).toBe("owner");
    expect(canLogistics(effectiveRole(true, null), "manage_rates")).toBe(true);
  });
  it("15) a role without rights cannot manage", () => {
    expect(canLogistics("viewer", "manage_rates")).toBe(false);
    expect(canLogistics(null, "view_logistics")).toBe(false);
  });
});

// ─────────── §20.16 / §20.17 — idempotent maintenance + backfill (mocked prisma) ───────────
type Dest = { id: string; companyId: string; name: string; normalizedName: string; country: string | null; active: boolean };
type SetRow = { id: string; companyId: string; destination: string | null; destinationId: string | null };

function makeMock(sets: SetRow[]) {
  const dests: Dest[] = [];
  let seq = 0;
  const destApi = {
    findUnique: async ({ where }: { where: { companyId_normalizedName: { companyId: string; normalizedName: string } } }) => {
      const key = where.companyId_normalizedName;
      return dests.find((d) => d.companyId === key.companyId && d.normalizedName === key.normalizedName) ?? null;
    },
    create: async ({ data }: { data: Partial<Dest> }) => { const d = { id: `d${++seq}`, country: null, active: true, ...data } as Dest; dests.push(d); return d; },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Dest> }) => { const d = dests.find((x) => x.id === where.id)!; Object.assign(d, data); return d; },
    findMany: async ({ where }: { where: { companyId: string } }) => dests.filter((d) => d.companyId === where.companyId),
  };
  const setApi = {
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      let res = sets.filter((s) => s.companyId === where.companyId);
      const destWhere = where.destination as { not?: null } | undefined;
      if (destWhere && destWhere.not === null) res = res.filter((s) => s.destination !== null);
      if (where.destinationId === null) res = res.filter((s) => s.destinationId === null);
      return res;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<SetRow> }) => { const s = sets.find((x) => x.id === where.id)!; Object.assign(s, data); return s; },
  };
  return { prisma: { logisticsDestination: destApi, exportDocumentSet: setApi } as never, dests, sets };
}

describe("maintainDestinations — idempotent + backfill", () => {
  it("16) re-running creates no duplicates; the 12 become inactive", async () => {
    const sets: SetRow[] = [];
    const m = makeMock(sets);
    await maintainDestinations(m.prisma, "co1");
    const count1 = m.dests.length;
    const r2 = await maintainDestinations(m.prisma, "co1");
    expect(m.dests.length).toBe(count1);
    expect(r2.created).toBe(0);
    const skopie = m.dests.find((d) => d.normalizedName === "skopie");
    expect(skopie?.name).toBe("Skopie");
    expect(skopie?.active).toBe(true);
    for (const key of INACTIVE_NORMALIZED_KEYS) {
      const d = m.dests.find((x) => x.normalizedName === key);
      if (d) expect(d.active).toBe(false);
    }
  });

  it("17) legacy combined string is imported without loss and destinationId is backfilled to Skopie", async () => {
    const sets: SetRow[] = [{ id: "s1", companyId: "co1", destination: "Skopie / FCA SKOPIE", destinationId: null }];
    const m = makeMock(sets);
    await maintainDestinations(m.prisma, "co1");
    expect(m.dests.some((d) => d.name.includes("FCA"))).toBe(false);
    const skopie = m.dests.find((d) => d.normalizedName === "skopie")!;
    expect(m.sets[0].destinationId).toBe(skopie.id);
    expect(m.sets[0].destination).toBe("Skopie / FCA SKOPIE");
  });

  it("an unknown legacy destination is imported as active (no loss)", async () => {
    const sets: SetRow[] = [{ id: "s2", companyId: "co1", destination: "Ohrid", destinationId: null }];
    const m = makeMock(sets);
    await maintainDestinations(m.prisma, "co1");
    const ohrid = m.dests.find((d) => d.normalizedName === normalizeDestination("Ohrid"));
    expect(ohrid?.active).toBe(true);
    expect(m.sets[0].destinationId).toBe(ohrid!.id);
  });
});
