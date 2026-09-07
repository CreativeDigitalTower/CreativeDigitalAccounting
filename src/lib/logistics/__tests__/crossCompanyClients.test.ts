import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { collapseByCanonical } from "@/lib/logistics/clientDedupe";

const read = (p: string) => fs.readFileSync(p, "utf-8");

// Реален сценарий: SEM има canonical клиент; стара доставка сочи към Metal Trade Client за
// същия реален клиент (по ЕИК/име). Списъкът трябва да даде ЕДИН ред със сумарна статистика.
describe("collapseByCanonical — cross-company (§1/§6/§7/§8)", () => {
  const semBase = [
    { id: "sem_aradiko", name: "ARADIKO KOP DOOEL", eik: "4069010500430" },
    { id: "sem_veko", name: "VEKO TRANS DOOEL", eik: null },
  ];
  const meta = [
    { id: "sem_aradiko", name: "ARADIKO KOP DOOEL", eik: "4069010500430" },
    { id: "mt_aradiko", name: "ARADIKO KOP DOOEL", eik: "4069010500430" }, // Metal Trade duplicate (same EIK)
    { id: "mt_veko", name: "VEKO  TRANS  DOOEL", eik: null },              // Metal Trade duplicate (same normalized name)
    { id: "mt_unknown", name: "UNKNOWN CO", eik: "999" },                  // без SEM съвпадение
  ];
  const agg = [
    { clientId: "sem_aradiko", deliveries: 1, quantity: 25, lastDelivery: "2026-07-01T00:00:00.000Z" },
    { clientId: "mt_aradiko", deliveries: 1, quantity: 26.04, lastDelivery: "2026-09-01T00:00:00.000Z" },
    { clientId: "mt_veko", deliveries: 3, quantity: 90, lastDelivery: "2026-08-15T00:00:00.000Z" },
    { clientId: "mt_unknown", deliveries: 2, quantity: 40, lastDelivery: "2026-06-01T00:00:00.000Z" },
  ];
  const m = collapseByCanonical(semBase, meta, agg);

  it("1/4) ЕДИН canonical ред за ARADIKO (Metal Trade + SEM доставки заедно)", () => {
    expect(m.has("sem_aradiko")).toBe(true);
    expect(m.has("mt_aradiko")).toBe(false); // не се появява отделно
  });
  it("5) статистиката се сумира; последна доставка = най-новата", () => {
    const a = m.get("sem_aradiko")!;
    expect(a.deliveries).toBe(2);
    expect(a.quantity).toBe(51.04);
    expect(a.lastDelivery).toBe("2026-09-01T00:00:00.000Z");
  });
  it("3) match по нормализирано име (VEKO с двойни интервали) → canonical SEM", () => {
    expect(m.get("sem_veko")!.deliveries).toBe(3);
    expect(m.has("mt_veko")).toBe(false);
  });
  it("клиент без SEM съвпадение остава самостоятелен (веднъж)", () => {
    expect(m.get("mt_unknown")!.deliveries).toBe(2);
  });
});

describe("GET /logistics/clients — canonical resolution (§7/§8)", () => {
  const s = read("src/app/api/logistics/clients/route.ts");
  it("5) ползва collapseByCanonical вместо да append-ва delivery клиенти като отделни редове", () => {
    expect(s).toContain("collapseByCanonical");
    expect(s).toMatch(/const meta = aggClientIds\.length/);
  });
});

describe("Cross-company migration script (§11/§12)", () => {
  const s = read("scripts/audit-logistics-client-links.mjs");
  it("6) премества ExportDocumentSet.clientId към canonical SEM", () => {
    expect(s).toContain("exportDocumentSet.updateMany");
    expect(s).toContain("data: { clientId: canonical.id }");
  });
  it("11) отчита CLIENT/METAL_TRADE_CLIENT_ID/SEM_CLIENT_ID/AMBIGUOUS/SAFE_TO_MIGRATE", () => {
    for (const t of ["METAL_TRADE_CLIENT_ID", "SEM_CLIENT_ID", "EXPORT_DELIVERIES_TO_MOVE", "AMBIGUOUS", "SAFE_TO_MIGRATE"]) expect(s).toContain(t);
  });
  it("7) не пипа snapshots; verify + rollback", () => {
    expect(s).not.toMatch(/Snapshot/);
    expect(s).toContain("$transaction");
    expect(s).toContain("verify fail");
  });
  it("12/13/14) ambiguous не се мигрира; foreign се трие само без други релации, иначе архив", () => {
    expect(s).toMatch(/ambiguous/i);
    expect(s).toContain("rest.total === 0");
    expect(s).toContain("archivedAt: new Date()");
  });
  it("dry-run по подразбиране", () => {
    expect(s).toMatch(/APPLY = process\.argv\.includes\("--apply"\)/);
  });
});

describe("Future create stays SEM-canonical (§9/§10)", () => {
  it("8) export/new dropdown зарежда клиентите на buyer (SEM), не на активната фирма", () => {
    const s = read("src/app/(app)/dashboard/logistics/export/new/page.tsx");
    expect(s).toContain("groupCounterparties");
    expect(s).toMatch(/companyId:\s*defaultBuyerId/);
  });
  it("9/10) inline add краен клиент създава под buyer (SEM) фирма", () => {
    const s = read("src/app/api/logistics/buyer-clients/route.ts");
    expect(s).toContain("companyId: d.companyId"); // buyer companyId, валидиран в групата
    expect(s).toContain("assertLinkedBuyer");
  });
});
