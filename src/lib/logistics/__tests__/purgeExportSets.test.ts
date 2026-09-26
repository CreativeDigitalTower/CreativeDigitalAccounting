import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { purgeExportSets } from "@/lib/logistics/purgeExportSets";

vi.mock("@/lib/documents", () => ({ audit: vi.fn(async () => {}) }));

const read = (p: string) => fs.readFileSync(p, "utf-8");

type SetRow = { id: string; companyId: string; invoiceNumber: string; deletedAt: Date | null };
function makeMock(sets: SetRow[]) {
  const deleted: string[] = [];
  const matches = (s: SetRow, where: Record<string, unknown>) => {
    if (where.companyId && s.companyId !== where.companyId) return false;
    const del = where.deletedAt as { not?: null } | null | undefined;
    if (del && typeof del === "object" && "not" in del && del.not === null) { if (s.deletedAt === null) return false; }
    else if (del === null) { if (s.deletedAt !== null) return false; }
    const idIn = (where.id as { in?: string[] } | undefined)?.in;
    if (idIn && !idIn.includes(s.id)) return false;
    return true;
  };
  const api = {
    exportDocumentSet: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        sets.filter((s) => matches(s, where)).map((s) => ({ id: s.id, invoiceNumber: s.invoiceNumber })),
      delete: ({ where }: { where: { id: string } }) => { deleted.push(where.id); return Promise.resolve({ id: where.id }); },
    },
    // $transaction(array) → изпълнява подадените promise-и (delete вече е стартиран).
    $transaction: async (arr: Promise<unknown>[]) => Promise.all(arr),
  };
  return { prisma: api as never, sets, deleted };
}

const CO = "co1", OTHER = "co2";
const rows = (): SetRow[] => [
  { id: "a", companyId: CO, invoiceNumber: "0001", deletedAt: new Date() },  // trashed (own)
  { id: "b", companyId: CO, invoiceNumber: "0002", deletedAt: new Date() },  // trashed (own)
  { id: "c", companyId: CO, invoiceNumber: "0003", deletedAt: null },        // ACTIVE (own)
  { id: "d", companyId: OTHER, invoiceNumber: "0004", deletedAt: new Date() }, // trashed (foreign)
];

describe("purgeExportSets — tenant + trash guards (§11/§12/§14/§15)", () => {
  it("2/3) trashed доставка на фирмата се изтрива", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", ids: ["a"] });
    expect(res.deleted).toBe(1);
    expect(m.deleted).toEqual(["a"]);
  });
  it("1/12) АКТИВНА доставка НЕ може да бъде hard-deleted", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", ids: ["c"] });
    expect(res.deleted).toBe(0);
    expect(m.deleted).toEqual([]);
  });
  it("8/10) чужда фирма не може да се изтрие (tenant isolation)", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", ids: ["d"] });
    expect(res.deleted).toBe(0);
    expect(m.deleted).toEqual([]);
  });
  it("9/14) bulk: трие само валидните trashed; активни/чужди се игнорират без partial fail", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", ids: ["a", "b", "c", "d", "zzz"] });
    expect(res.deleted).toBe(2);
    expect(res.requested).toBe(5);
    expect(new Set(m.deleted)).toEqual(new Set(["a", "b"]));
  });
  it("5/11/12/13) Empty Trash засяга само trashed на текущата фирма (не активни, не чужди)", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", emptyTrash: true });
    expect(res.deleted).toBe(2);
    expect(new Set(m.deleted)).toEqual(new Set(["a", "b"]));
    // активната „c" и чуждата „d" остават
    expect(m.deleted).not.toContain("c");
    expect(m.deleted).not.toContain("d");
  });
  it("празен ids → нищо не се трие (без deleteMany)", async () => {
    const m = makeMock(rows());
    const res = await purgeExportSets(m.prisma, { companyId: CO, userId: "u1", ids: [] });
    expect(res.deleted).toBe(0);
    expect(m.deleted).toEqual([]);
  });
});

describe("hard delete — shared master се ЗАПАЗВА (§9) чрез schema onDelete", () => {
  it("owned children cascade; shared/бизнес → SetNull (schema потвърждава)", () => {
    const schema = read("prisma/schema.prisma");
    // ExportDocument + ExportAttachment → Cascade (owned)
    expect(schema).toMatch(/set ExportDocumentSet @relation\(fields: \[setId\][^)]*onDelete: Cascade/);
    expect(schema).toMatch(/exportSet ExportDocumentSet @relation\(fields: \[exportSetId\][^)]*onDelete: Cascade/);
    // MkInvoice / Document(фактури) / Shipment / Destination → SetNull (shared, не се трият)
    expect(schema).toMatch(/sourceExportSet ExportDocumentSet\? @relation\(fields: \[sourceExportSetId\][^)]*onDelete: SetNull/);
    expect(schema).toMatch(/sourceExportSet ExportDocumentSet\? @relation\("ExportSetInvoices"[^)]*onDelete: SetNull/);
    expect(schema).toMatch(/destinationRef LogisticsDestination\? @relation\([^)]*onDelete: SetNull/);
  });
});

describe("статистики игнорират Кошчето (§6/§7/§21) — deletedAt: null навсякъде", () => {
  const files = [
    "src/app/api/logistics/reports/route.ts",
    "src/app/api/logistics/fleet/route.ts",
    "src/app/api/logistics/destinations/route.ts",
    "src/app/api/logistics/destinations/[id]/route.ts",
    "src/app/api/logistics/destinations/[id]/deliveries/route.ts",
    "src/app/api/logistics/vehicles/[id]/stats/route.ts",
    "src/app/api/logistics/clients/route.ts",
  ];
  it.each(files)("%s филтрира deletedAt: null върху export set заявките", (f) => {
    const s = read(f);
    const idx = s.indexOf("exportDocumentSet.");
    expect(idx, `${f} трябва да заявява exportDocumentSet`).toBeGreaterThan(-1);
    expect(s).toContain("deletedAt: null");
  });
});
