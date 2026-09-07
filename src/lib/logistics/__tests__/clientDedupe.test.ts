import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { normalizeEik, normalizeClientName, clientMatchKey, groupDuplicates, pickCanonical, computeFieldMerges } from "@/lib/logistics/clientDedupe";

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("Duplicate detection (§3)", () => {
  it("1) еднакъв ЕИК → дубликат дори при леко различно име", () => {
    const g = groupDuplicates([
      { id: "a", name: "ARADIKO KOP DOOEL", eik: "4069010500430" },
      { id: "b", name: "Aradiko Kop  DOOEL", eik: "4069010500430" },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0]).toHaveLength(2);
  });
  it("2) нормализирано име → дубликат при разлики в интервали/пунктуация/тире", () => {
    const g = groupDuplicates([
      { id: "a", name: "АЦЕ ТРАНС - КОМПАНИ ДООЕЛ", eik: null },
      { id: "b", name: "АЦЕ ТРАНС КОМПАНИ ДООЕЛ", eik: null },
    ]);
    expect(g).toHaveLength(1);
  });
  it("3) различен ЕИК / различно име → НЕ се групират (без fuzzy, §3)", () => {
    expect(groupDuplicates([
      { id: "a", name: "VEKO TRANS DOOEL", eik: "1" },
      { id: "b", name: "VEKO TRANS DOOEL", eik: "2" }, // различен ЕИК → различни
    ])).toHaveLength(0);
    expect(groupDuplicates([
      { id: "a", name: "MAK-BET DOO", eik: null },
      { id: "b", name: "MAK BETON DOO", eik: null }, // различно нормализирано име
    ])).toHaveLength(0);
  });
  it("clientMatchKey: ЕИК приоритет; normalizeEik/Name", () => {
    expect(clientMatchKey({ eik: "MK 12/34", name: "X" })).toBe("eik:MK1234");
    expect(clientMatchKey({ eik: null, name: "Дине-Трейд ДОО" })).toBe(`name:${normalizeClientName("Дине-Трейд ДОО")}`);
    expect(normalizeEik("  ")).toBeNull();
  });
});

describe("Canonical selection & field merges (§4/§6)", () => {
  it("canonical = най-много релации, после най-стар", () => {
    const c = pickCanonical([
      { id: "empty", name: "X", eik: "1", relationCount: 0, createdAt: "2025-01-01" },
      { id: "full", name: "X", eik: "1", relationCount: 3, createdAt: "2026-01-01" },
    ]);
    expect(c.id).toBe("full");
  });
  it("6) празно canonical поле се допълва; конфликт се докладва, не се презаписва", () => {
    const { fills, conflicts } = computeFieldMerges(
      { phone: null, city: "Tetovo", baseAddress: "" },
      { phone: "070123456", city: "Skopje", baseAddress: "Zona 1" },
    );
    expect(fills.phone).toBe("070123456");
    expect(fills.baseAddress).toBe("Zona 1");
    expect(conflicts.find((c) => c.field === "city")).toBeTruthy(); // Tetovo vs Skopje
    expect(fills.city).toBeUndefined();
  });
});

describe("Dedup script — safe merge (§4/§5/§7/§8)", () => {
  const s = read("scripts/dedupe-logistics-clients.mjs");
  it("4) премества всички релации, вкл. exportDocumentSet/document/mkInvoice", () => {
    for (const m of ["exportDocumentSet", "document", "mkInvoice", "contract", "project", "payment"]) expect(s).toContain(`"${m}"`);
    expect(s).toContain("updateMany");
  });
  it("7/8) транзакция + verify + rollback; idempotent dry-run по подразбиране", () => {
    expect(s).toContain("$transaction");
    expect(s).toContain("verify fail");
    expect(s).toMatch(/APPLY = process\.argv\.includes\("--apply"\)/);
  });
  it("5) не пипа historical snapshots — само clientId FK", () => {
    expect(s).not.toMatch(/Snapshot/);
    expect(s).toContain("data: { clientId: canonical.id }");
  });
  it("§28 scoped към конкретна SEM фирма, не масово", () => {
    expect(s).toContain("--company-id");
    expect(s).toContain("companyId: company.id");
  });
});

describe("Future duplicate prevention (§10)", () => {
  it("9) create paths ползват нормализиран dedup (ЕИК/име)", () => {
    const a = read("src/app/api/logistics/clients/route.ts");
    expect(a).toContain("normalizeEik");
    expect(a).toContain("normalizeClientName");
    const b = read("src/app/api/logistics/buyer-clients/route.ts");
    expect(b).toContain("normalizeClientName");
  });
});

describe("Safe delete / archive (§11-§16)", () => {
  const s = read("src/app/api/logistics/clients/[id]/route.ts");
  it("12/13) delete проверява релации; при история → archive, иначе hard delete", () => {
    expect(s).toContain("clientRelationCounts");
    expect(s).toMatch(/counts\.total > 0/);
    expect(s).toContain("archivedAt: new Date()");
    expect(s).toContain("prisma.client.delete");
  });
  it("10) delete/edit изискват manage_documents", () => {
    expect(s).toMatch(/DELETE[\s\S]*manage_documents/);
  });
  it("16) list скрива архивирани по подразбиране + toggle", () => {
    const l = read("src/app/api/logistics/clients/route.ts");
    expect(l).toContain("archivedAt: null");
    expect(l).toContain('sp.get("archived")');
  });
});

describe("Address model (§17-§22/§28)", () => {
  it("17/18) baseAddress и archivedAt са в схемата (additive)", () => {
    const sc = read("prisma/schema.prisma");
    expect(sc).toMatch(/baseAddress\s+String\?/);
    expect(sc).toMatch(/archivedAt\s+DateTime\?/);
  });
  it("19/20) create + patch приемат baseAddress; dossier го връща", () => {
    expect(read("src/app/api/logistics/clients/route.ts")).toContain("baseAddress");
    expect(read("src/app/api/logistics/clients/[id]/route.ts")).toContain("baseAddress");
  });
  it("20) search покрива baseAddress/address", () => {
    const l = read("src/app/api/logistics/clients/route.ts");
    expect(l).toMatch(/c\.address, c\.baseAddress/);
  });
  it("22) нов клиент се създава под финалната (SEM) фирма", () => {
    const l = read("src/app/api/logistics/clients/route.ts");
    expect(l).toContain("resolveFinalClientCompanyId");
    expect(l).toContain("companyId: finalCompanyId");
  });
  it("i18n: fRegAddress/fBaseAddress/restore за всички езици", () => {
    for (const lng of ["bg", "en", "ru", "ro", "tr", "el"]) {
      const j = JSON.parse(read(`src/locales/${lng}/logistics.json`));
      expect(j.clients?.fRegAddress).toBeTruthy();
      expect(j.clients?.fBaseAddress).toBeTruthy();
      expect(j.clients?.restore).toBeTruthy();
    }
  });
});
