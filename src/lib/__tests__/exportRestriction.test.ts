// §13 — regression за абсолютното бизнес правило:
//   METAL TRADE KUSTENDIL 2005 Ltd. → МОЖЕ да създава експортни доставки.
//   SEM INTERNATIONAL DOOEL         → НЕ МОЖЕ.
// Единствен source of truth: Company.logisticsExportCreate (§11). Guard-ът е server-side
// на три слоя: POST API (403), route (redirect) и UI (скрит бутон).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { isExportCreateAllowed } from "@/lib/logistics/exportPermissions";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const ROUTE = "src/app/api/logistics/export-sets/route.ts";
const NEW_PAGE = "src/app/(app)/dashboard/logistics/export/new/page.tsx";
const LIST_PAGE = "src/app/(app)/dashboard/logistics/export/page.tsx";
const LIST_COMP = "src/components/app/logistics/ExportSetsList.tsx";
const ACCESS = "src/lib/logistics/access.ts";
const SCRIPT = "scripts/configure-sem-international.mjs";

describe("Permission rule (единствено поле, §11/§12)", () => {
  it("1) Metal Trade (default true/null/undefined) МОЖЕ", () => {
    expect(isExportCreateAllowed(true)).toBe(true);
    expect(isExportCreateAllowed(null)).toBe(true);
    expect(isExportCreateAllowed(undefined)).toBe(true);
  });
  it("2) SEM (explicit false) НЕ МОЖЕ", () => {
    expect(isExportCreateAllowed(false)).toBe(false);
  });
});

describe("A) Server-side API guard (POST → 403)", () => {
  const s = read(ROUTE);
  it("извиква companyCanCreateExports и връща 403", () => {
    expect(s).toContain("companyCanCreateExports");
    expect(s).toMatch(/status:\s*403/);
  });
  it("guard-ът се изпълнява ПРЕДИ да се чете/парсва request body (не зависи от body)", () => {
    const guardIdx = s.indexOf("companyCanCreateExports");
    const bodyIdx = s.indexOf("await req.json()");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(bodyIdx);
  });
  it("7) companyId идва от session guard-а (g.companyId), НЕ от body", () => {
    // Проверката ползва активната фирма от logisticsApiGuard, не подадено поле.
    expect(s).toMatch(/companyCanCreateExports\(g\.companyId\)/);
    // Записът също е scoped към активната фирма, не към body companyId.
    expect(s).toMatch(/companyId:\s*g\.companyId/);
    expect(s).not.toMatch(/companyId:\s*d\.companyId/);
  });
});

describe("B) Route guard (direct URL → redirect)", () => {
  it("3) export/new пренасочва, когато фирмата не може да създава", () => {
    const s = read(NEW_PAGE);
    expect(s).toContain("companyCanCreateExports");
    expect(s).toMatch(/redirect\(/);
  });
});

describe("C) UI (скрит create бутон)", () => {
  it("4) списъкът подава canCreate, а бутонът е gated от него", () => {
    expect(read(LIST_PAGE)).toContain("companyCanCreateExports");
    const c = read(LIST_COMP);
    expect(c).toContain("canCreate");
  });
});

describe("5/6) Super Admin НЕ заобикаля правилото", () => {
  it("companyCanCreateExports е role-independent (чете само фирмения флаг)", () => {
    const s = read(ACCESS);
    const start = s.indexOf("export async function companyCanCreateExports");
    const body = s.slice(start, start + 400);
    expect(body).toContain("logisticsExportCreate");
    expect(body).toContain("isExportCreateAllowed");
    // Няма зависимост от роля/супер-админ вътре в capability проверката.
    expect(body).not.toMatch(/role|SuperAdmin|isSuperAdmin/);
  });
});

describe("Няма legacy/duplicate create path", () => {
  it("exportDocumentSet.create съществува само в guard-натия POST route", () => {
    const files = fs
      .readdirSync("src/app/api/logistics/export-sets", { recursive: true })
      .filter((f) => typeof f === "string" && f.endsWith(".ts"))
      .map((f) => `src/app/api/logistics/export-sets/${f}`);
    const creators = files.filter((f) => /exportDocumentSet\.create\b/.test(read(f)));
    expect(creators).toEqual([ROUTE]);
  });
});

describe("9/10) Config script", () => {
  const s = read(SCRIPT);
  it("9) задава SEM.logisticsExportCreate = false и верифицира след запис", () => {
    expect(s).toMatch(/logisticsExportCreate:\s*false/);
    expect(s).toContain("after?.logisticsExportCreate !== false");
  });
  it("10) НЕ форсира продавача (Metal Trade) на false — само на true при нужда", () => {
    // Единственият update на seller е към true; никъде seller → false.
    expect(s).toMatch(/data:\s*\{\s*logisticsExportCreate:\s*true\s*\}/);
    expect(s).not.toMatch(/seller[\s\S]{0,80}logisticsExportCreate:\s*false/);
  });
  it("използва стабилен идентификатор (--id / --group / group relation), не само име", () => {
    expect(s).toContain("--id");
    expect(s).toContain("--group");
    expect(s).toContain("companyGroupId");
  });
});
