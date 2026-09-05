import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { sortClients, clientKpis, isClientSort, type ClientStatRow } from "@/lib/logistics/clientStats";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const rows: ClientStatRow[] = [
  { id: "a", name: "JJU BAU", eik: null, deliveries: 27, quantity: 702.48, lastDelivery: "2026-08-30" },
  { id: "b", name: "NEW BETON", eik: null, deliveries: 0, quantity: 0, lastDelivery: null },
  { id: "c", name: "ALFA", eik: null, deliveries: 5, quantity: 900.1, lastDelivery: "2026-09-01" },
];

describe("clientStats (§16-§18/§35/§36)", () => {
  it("14/15) KPI: общо клиенти, доставки, количество, активни", () => {
    const k = clientKpis(rows);
    expect(k.totalClients).toBe(3);
    expect(k.deliveries).toBe(32);
    expect(k.quantity).toBe(1602.58);
    expect(k.activeClients).toBe(2); // само с deliveries>0
  });
  it("26) sort by deliveries / quantity / recent / name", () => {
    expect(sortClients(rows, "deliveries_desc").map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortClients(rows, "quantity_desc").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortClients(rows, "recent").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortClients(rows, "name_asc").map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
  it("isClientSort guard", () => {
    expect(isClientSort("deliveries_desc")).toBe(true);
    expect(isClientSort("bogus")).toBe(false);
  });
});

describe("Server wiring — derived, company-scoped, soft-delete aware (§19/§37/§42)", () => {
  it("fleet API агрегира курсове по автомобил за период (groupBy, без N+1)", () => {
    const s = read("src/app/api/logistics/fleet/route.ts");
    expect(s).toContain("exportDocumentSet.groupBy");
    expect(s).toMatch(/by:\s*\["truckVehicleId"\]/);
    expect(s).toContain("deletedAt: null");
    expect(s).toContain("resolvePeriodRange");
  });
  it("17) клиентската статистика идва от Export Deliveries, не от ръчни counters", () => {
    const s = read("src/app/api/logistics/clients/route.ts");
    expect(s).toContain("exportDocumentSet.groupBy");
    expect(s).toMatch(/by:\s*\["clientId"\]/);
    expect(s).toContain("deletedAt: null");
    expect(s).toContain("resolveFinalClientCompanyId"); // §20 final-client relation
  });
  it("20/28) новият клиент се създава в SEM CRM, валидирано в групата", () => {
    const s = read("src/app/api/logistics/clients/route.ts");
    expect(s).toContain("resolveFinalClientCompanyId");
    expect(s).toContain("assertClientCompanyInGroup");
  });
  it("24/31) редакцията не пренаписва snapshot-и (само Client master полета)", () => {
    const s = read("src/app/api/logistics/clients/[id]/route.ts");
    expect(s).toContain("prisma.client.update");
    expect(s).not.toContain("exportDocumentSet.update"); // не пипа доставки/snapshot-и
    // PATCH обновява само Client master полета (name/eik/...), не snapshot колони.
    const patchBody = s.slice(s.indexOf("prisma.client.update"));
    expect(patchBody).not.toMatch(/Snapshot/);
  });
  it("29) vehicle stats endpoint: soft-deleted изключен, архивиран пази история", () => {
    const s = read("src/app/api/logistics/vehicles/[id]/stats/route.ts");
    expect(s).toContain("deletedAt: null");
    expect(s).not.toMatch(/active:\s*true/); // не филтрира по active → архивиран пази история (§15)
  });
});

describe("i18n — без raw keys за новите текстове (§17/§53)", () => {
  it("logistics.period/fleet/clients ключове има за всички езици", () => {
    for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${l}/logistics.json`));
      expect(j.period?.thisMonth, `period.thisMonth ${l}`).toBeTruthy();
      expect(j.fleet?.trips, `fleet.trips ${l}`).toBeTruthy();
      expect(j.fleet?.statsTitle, `fleet.statsTitle ${l}`).toBeTruthy();
      expect(j.clients?.addClient, `clients.addClient ${l}`).toBeTruthy();
      expect(j.clients?.deliveries, `clients.deliveries ${l}`).toBeTruthy();
    }
  });
});
