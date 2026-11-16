import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { resolveActorContext } from "@/lib/company/context";

// ─────────────────────────────────────────────────────────────────────────
// Регресия за multi-tenant изолацията на „Обобщен изглед" (Overview).
//
// Root cause: страницата резолвеше фирмите през `getMyCompanies(userId)`, където
// `userId` идва от `requireCompany()` и е ВИНАГИ реалният актьор (при Super Admin
// technical access — самият Super Admin). Затова при „влизане" в произволна
// клиентска фирма Overview показваше личните фирми на Super Admin (вкл. CDT) и
// едни и същи числа за всяка фирма. Поправката я изравнява със сестринската
// „Моите фирми" страница: `getEffectiveContext()` + при impersonation —
// `getContextCompanies({ contextUserId, targetCompanyId })`.
// ─────────────────────────────────────────────────────────────────────────

const read = (p: string) => fs.readFileSync(p, "utf-8");
const OVERVIEW = "src/app/(app)/dashboard/overview/page.tsx";
const COMPANIES = "src/app/(app)/dashboard/companies/page.tsx";
const MYCOMPANIES = "src/lib/myCompanies.ts";

describe("Overview резолвва фирмите през ефективния контекст (§A/§B/§16.2)", () => {
  const src = read(OVERVIEW);

  it("използва getEffectiveContext (а не actor userId от requireCompany)", () => {
    expect(src).toContain("getEffectiveContext");
  });
  it("при impersonation минава през getContextCompanies(target), иначе getMyCompanies(actor)", () => {
    expect(src).toContain("getContextCompanies");
    expect(src).toMatch(/ctx\.impersonating\s*\n?\s*\?\s*await getContextCompanies/);
    expect(src).toContain("getMyCompanies(ctx.actorUserId)");
  });
  it("НЕ резолвва фирмен списък директно от requireCompany().userId (старата дупка)", () => {
    expect(src).not.toMatch(/getMyCompanies\(\s*userId\s*\)/);
    expect(src).not.toMatch(/const\s*\{\s*userId\s*\}\s*=\s*await requireCompany/);
  });
  it("запазва guard-овете (requireCompany: служители → портал, счет. къщи → /firm)", () => {
    expect(src).toContain("await requireCompany()");
  });
});

describe("Overview и Моите фирми ползват една и съща контекст-логика (§13/§B)", () => {
  it("двете страници резолвват през getEffectiveContext + getContextCompanies", () => {
    for (const f of [OVERVIEW, COMPANIES]) {
      const s = read(f);
      expect(s, f).toContain("getEffectiveContext");
      expect(s, f).toContain("getContextCompanies");
    }
  });
});

describe("getContextCompanies никога не включва личните фирми на Super Admin (§5/§E/§19)", () => {
  const lib = read(MYCOMPANIES);
  it("OR-филтърът ползва САМО contextUserId (target owner), не actor/Super Admin", () => {
    // ownedWhere се добавя единствено за contextUserId, не за актьора.
    expect(lib).toContain("if (opts.contextUserId) or.push(ownedWhere(opts.contextUserId));");
    expect(lib).not.toMatch(/ownedWhere\(\s*opts\.actorUserId/);
    expect(lib).not.toMatch(/ownedWhere\(\s*actorUserId/);
  });
  it("explicitIds обхваща само target фирмата + нейната бизнес група", () => {
    expect(lib).toContain("opts.targetCompanyId");
    expect(lib).toContain("companyGroupId");
  });
});

// ── Pure-logic модел на селекцията (доказва алгоритъма без жива БД) ──
type Company = { id: string; ownerUserId: string; groupId: string | null };

/** Модел на getContextCompanies: target + неговата група + фирмите на target owner. */
function selectContextCompanies(all: Company[], targetCompanyId: string, contextUserId: string | null): string[] {
  const target = all.find((c) => c.id === targetCompanyId);
  const groupIds = target?.groupId ? all.filter((c) => c.groupId === target.groupId).map((c) => c.id) : [];
  const explicit = new Set<string>([targetCompanyId, ...groupIds]);
  const owned = contextUserId ? all.filter((c) => c.ownerUserId === contextUserId).map((c) => c.id) : [];
  return [...new Set([...explicit, ...owned])];
}

describe("Изолация при Super Admin technical access (§C/§D/§Тест B)", () => {
  // SA (sa) притежава CDT. Клиентът (client) притежава VEST98 + STARCLEAN.
  const all: Company[] = [
    { id: "cdt", ownerUserId: "sa", groupId: null },
    { id: "vest98", ownerUserId: "client", groupId: null },
    { id: "starclean", ownerUserId: "client", groupId: null },
    { id: "foreign", ownerUserId: "other", groupId: null },
  ];

  it("влизане във VEST98 → контекстът е на клиента, CDT НЕ се появява (§C/§E)", () => {
    const ctx = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: "vest98", targetOwnerUserId: "client" });
    const ids = selectContextCompanies(all, "vest98", ctx.contextUserId);
    expect(ids).toContain("vest98");
    expect(ids).toContain("starclean"); // същият собственик → в „неговия" обзор
    expect(ids).not.toContain("cdt");   // личните фирми на SA не изтичат
    expect(ids).not.toContain("foreign");
  });

  it("влизане в STARCLEAN → данните са за тази група собственик, не за CDT (§D)", () => {
    const ctx = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: "starclean", targetOwnerUserId: "client" });
    const ids = selectContextCompanies(all, "starclean", ctx.contextUserId);
    expect(ids).not.toContain("cdt");
    expect(new Set(ids)).toEqual(new Set(["vest98", "starclean"]));
  });

  it("нормален собственик (без impersonation) вижда само собствените си фирми (§Тест A)", () => {
    const ctx = resolveActorContext({ sessionUserId: "client", isSuperAdmin: false, impersonatedCompanyId: null, targetOwnerUserId: null });
    expect(ctx.impersonating).toBe(false);
    // Overview в този клон ползва getMyCompanies(actor) = ownedWhere(client).
    const own = all.filter((c) => c.ownerUserId === ctx.contextUserId).map((c) => c.id);
    expect(new Set(own)).toEqual(new Set(["vest98", "starclean"]));
    expect(own).not.toContain("cdt");
  });

  it("последователно влизане A → B → A не носи стар контекст (§Тест B)", () => {
    const seq = ["vest98", "starclean", "vest98"].map((target) => {
      const ctx = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: target, targetOwnerUserId: "client" });
      return { target, ids: selectContextCompanies(all, target, ctx.contextUserId) };
    });
    for (const step of seq) {
      expect(step.ids, step.target).toContain(step.target);
      expect(step.ids, step.target).not.toContain("cdt");
    }
  });
});

describe("Разрешените връзки/достъп остават непокътнати (§I/§Тест C/§G)", () => {
  it("/api/company/switch отказва фирма, в която потребителят не е член (IDOR)", () => {
    const route = read("src/app/api/company/switch/route.ts");
    expect(route).toContain("userId_companyId");
    expect(route).toMatch(/if \(!member\)/);
    expect(route).toContain("403");
  });
  it("бизнес групата (companyGroupId) се зачита — споделените връзки не се късат", () => {
    // Фирма с група → всички от групата влизат в обзора на контекста.
    const grouped: Company[] = [
      { id: "metaltrade", ownerUserId: "ownerA", groupId: "g1" },
      { id: "sem", ownerUserId: "ownerB", groupId: "g1" },
      { id: "unrelated", ownerUserId: "ownerC", groupId: null },
    ];
    const ids = selectContextCompanies(grouped, "metaltrade", null);
    expect(new Set(ids)).toEqual(new Set(["metaltrade", "sem"]));
    expect(ids).not.toContain("unrelated");
  });
});
