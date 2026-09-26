import { describe, it, expect } from "vitest";
import {
  SEED_DESTINATION_RECORDS, INACTIVE_DESTINATION_NAMES, INACTIVE_NORMALIZED_KEYS,
  stripDeliveryTermSuffix, isInactiveDestinationName, aggregateDestinationDeliveries, maintainDestinations,
  resolveActiveDestinationNames, canonicalDestination, canonicalDestinationKey, type DeliveryRow,
} from "@/lib/logistics/destinations";
import { normalizeDestination } from "@/lib/logistics/deliveryTerms";
import { canLogistics, effectiveRole } from "@/lib/logistics/perms";

// ─────────── §20.1 / §20.3 / §20.4 — seed корекция ───────────
describe("seed destination records", () => {
  it("1) the 12 named destinations resolve to an inactive canonical key", () => {
    const twelve = ["Batinci", "Butel", "Dolno Konjari", "Gostivar", "Jakimovo", "Lipkovo", "Nikushtak", "Orizari", "Petrovac", "Rzanicino", "Vizbegovo", "Vraca"];
    for (const name of twelve) {
      expect(INACTIVE_NORMALIZED_KEYS.has(canonicalDestinationKey(name))).toBe(true);
    }
  });
  it("exactly 12 canonical inactive records (aliases do not multiply them)", () => {
    expect(INACTIVE_DESTINATION_NAMES.length).toBe(12);
    expect(SEED_DESTINATION_RECORDS.filter((r) => !r.active).length).toBe(12);
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

function makeMock(sets: SetRow[], routes: { companyId: string; toPlace: string; active?: boolean }[] = [], shipments: { companyId: string; destination: string | null }[] = [], seedDests: Dest[] = [], logisticsExportCreate = true) {
  const dests: Dest[] = [...seedDests];
  let seq = 0;
  const companyApi = {
    findUnique: async (_args: unknown) => ({ logisticsExportCreate }),
  };
  const destApi = {
    findUnique: async ({ where }: { where: { companyId_normalizedName: { companyId: string; normalizedName: string } } }) => {
      const key = where.companyId_normalizedName;
      return dests.find((d) => d.companyId === key.companyId && d.normalizedName === key.normalizedName) ?? null;
    },
    create: async ({ data }: { data: Partial<Dest> }) => { const d = { id: `d${++seq}`, country: null, active: true, ...data } as Dest; dests.push(d); return d; },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Dest> }) => { const d = dests.find((x) => x.id === where.id)!; Object.assign(d, data); return d; },
    findMany: async ({ where }: { where: { companyId: string; active?: boolean } }) =>
      dests.filter((d) => d.companyId === where.companyId && (where.active === undefined || d.active === where.active)),
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
  const routeApi = {
    findMany: async ({ where }: { where: { companyId: string; active?: boolean } }) =>
      routes.filter((r) => r.companyId === where.companyId && (where.active === undefined || (r.active ?? true) === where.active)),
  };
  const shipmentApi = {
    findMany: async ({ where }: { where: { companyId: string; destination?: { not?: null } } }) => {
      let res = shipments.filter((s) => s.companyId === where.companyId);
      if (where.destination && where.destination.not === null) res = res.filter((s) => s.destination !== null);
      return res;
    },
  };
  return { prisma: { company: companyApi, logisticsDestination: destApi, exportDocumentSet: setApi, logisticsRoute: routeApi, shipment: shipmentApi } as never, dests, sets, routes, shipments };
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

  it("2) recovers destinations from LogisticsRoute.toPlace and Shipment.destination", async () => {
    const m = makeMock([], [{ companyId: "co1", toPlace: "Ohrid" }], [{ companyId: "co1", destination: "Bitola" }]);
    await maintainDestinations(m.prisma, "co1");
    expect(m.dests.find((d) => d.normalizedName === normalizeDestination("Ohrid"))?.active).toBe(true);
    expect(m.dests.find((d) => d.normalizedName === normalizeDestination("Bitola"))?.active).toBe(true);
  });

  it("4/5/6/7/8) Skopie/Kochani/Rankovce/Kriva Palanka/Kumanovo stay active after recovery", async () => {
    const m = makeMock([]);
    await maintainDestinations(m.prisma, "co1");
    for (const name of ["Skopie", "Kochani", "Rankovce", "Kriva Palanka", "Kumanovo"]) {
      const d = m.dests.find((x) => x.normalizedName === normalizeDestination(name));
      expect(d, name).toBeTruthy();
      expect(d!.active, name).toBe(true);
    }
  });

  it("10) missing address is not invented (created records have null address)", async () => {
    const m = makeMock([]);
    await maintainDestinations(m.prisma, "co1");
    // Никой създаден запис няма измислен адрес.
    expect(m.dests.every((d) => (d as unknown as { address?: string | null }).address == null)).toBe(true);
  });
});

// ─────────── §8 / §17.1 — dropdown никога не е празен (fallback) ───────────
describe("resolveActiveDestinationNames (transitional fallback)", () => {
  it("1) empty master → legacy fallback (routes/used/MK), never empty", async () => {
    const m = makeMock(
      [{ id: "s1", companyId: "co1", destination: "Ohrid", destinationId: null }],
      [{ companyId: "co1", toPlace: "Bitola", active: true }],
    );
    const { names, source } = await resolveActiveDestinationNames(m.prisma, "co1");
    expect(source).toBe("legacy-fallback");
    expect(names.length).toBeGreaterThan(0);
    // Съдържа възстановими стойности…
    expect(names.some((n) => normalizeDestination(n) === normalizeDestination("Ohrid"))).toBe(true);
    expect(names.some((n) => normalizeDestination(n) === normalizeDestination("Bitola"))).toBe(true);
    expect(names.some((n) => normalizeDestination(n) === "skopie")).toBe(true);
    // …но НЕ и 12-те неактивни.
    expect(names.some((n) => normalizeDestination(n) === normalizeDestination("Gostivar"))).toBe(false);
  });

  it("populated master → master source (no fallback)", async () => {
    const seeded: Dest[] = [{ id: "d1", companyId: "co1", name: "Skopie", normalizedName: "skopie", country: "North Macedonia", active: true }];
    const m = makeMock([], [], [], seeded);
    const { names, source } = await resolveActiveDestinationNames(m.prisma, "co1");
    expect(source).toBe("master");
    expect(names).toEqual(["Skopie"]);
  });
});

// ─────────── §9/§10 — canonical alias dedupe (no duplicate master records) ───────────
describe("canonical alias collapse", () => {
  it.each([
    ["Kochani", "Кочани"],
    ["Kriva Palanka", "Кр. Паланка"],
    ["Kumanovo", "Куманово"],
    ["Rankovce", "Ранковце"],
    ["Skopie", "Скопие"],
    ["Skopie", "Skopie / FCA SKOPIE"],
    ["Shtip", "Штип"],
    ["Petrovec", "Petrovac"],
    ["Vraca", "Vratsa"],
  ])("%s and %s collapse to one canonical key/name", (latin, variant) => {
    expect(canonicalDestinationKey(latin)).toBe(canonicalDestinationKey(variant));
    expect(canonicalDestination(variant).name).toBe(canonicalDestination(latin).name);
  });

  it("11) Latin + Cyrillic legacy strings create ONE master record (no duplicate Skopie/Kochani)", async () => {
    const sets: SetRow[] = [
      { id: "s1", companyId: "co1", destination: "Кочани", destinationId: null },
      { id: "s2", companyId: "co1", destination: "Kochani", destinationId: null },
      { id: "s3", companyId: "co1", destination: "Скопие", destinationId: null },
      { id: "s4", companyId: "co1", destination: "Skopie / FCA SKOPIE", destinationId: null },
    ];
    const m = makeMock(sets, [{ companyId: "co1", toPlace: "Кр. Паланка" }]);
    await maintainDestinations(m.prisma, "co1");
    const count = (k: string) => m.dests.filter((d) => d.normalizedName === k).length;
    expect(count("kochani")).toBe(1);
    expect(count("skopie")).toBe(1);
    expect(count("krivapalanka")).toBe(1);
    // Всички 4 legacy sets backfill-ват към точно 2 canonical записа (Kochani, Skopie).
    expect(m.sets.find((s) => s.id === "s1")!.destinationId).toBe(m.sets.find((s) => s.id === "s2")!.destinationId);
    expect(m.sets.find((s) => s.id === "s3")!.destinationId).toBe(m.sets.find((s) => s.id === "s4")!.destinationId);
  });

  it("inactive aliases do not create duplicate inactive records (Petrovac/Petrovec, Vraca/Vratsa)", async () => {
    const sets: SetRow[] = [
      { id: "s1", companyId: "co1", destination: "Petrovac", destinationId: null },
      { id: "s2", companyId: "co1", destination: "Petrovec", destinationId: null },
      { id: "s3", companyId: "co1", destination: "Vratsa", destinationId: null },
    ];
    const m = makeMock(sets);
    await maintainDestinations(m.prisma, "co1");
    expect(m.dests.filter((d) => d.normalizedName === "petrovec").length).toBe(1);
    expect(m.dests.filter((d) => d.normalizedName === "vraca").length).toBe(1);
    expect(m.dests.find((d) => d.normalizedName === "petrovec")!.active).toBe(false);
  });
});

// ─────────── §2/§10 — company ownership (buyer skipped) ───────────
describe("company ownership guard", () => {
  it("buyer company (logisticsExportCreate=false) is skipped — no destinations created", async () => {
    const m = makeMock([], [], [], [], false);
    const res = await maintainDestinations(m.prisma, "sem");
    expect(res.created).toBe(0);
    expect(m.dests.length).toBe(0);
    expect(res.skipped).toBeTruthy();
  });
  it("seller company (logisticsExportCreate=true) is populated", async () => {
    const m = makeMock([], [], [], [], true);
    await maintainDestinations(m.prisma, "metaltrade");
    expect(m.dests.length).toBeGreaterThan(0);
  });
});
