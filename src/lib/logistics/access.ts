/**
 * Достъп до модул „Търговия, доставки и логистика" (корекции 1, 2, 4).
 *
 * Един database-driven механизъм: CompanyModuleAccess (per-company). НЯМА hardcode
 * на ЕИК и НЯМА implicit достъп през group ID — всяка фирма трябва да има собствен
 * enabled запис. Всички проверки са server-side и permission-scoped.
 */
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireCompany, getMyRole, isSuperAdmin } from "@/lib/session";
import { LOGISTICS_MODULE_KEY } from "@/lib/logistics/config";
import { canLogistics, logisticsCaps, effectiveRole, type LogisticsCaps } from "@/lib/logistics/perms";

export { canLogistics, logisticsCaps };
export type { LogisticsPermission, LogisticsCaps } from "@/lib/logistics/perms";

/** Дали фирмата има активиран достъп до логистичния модул (database-driven). */
export async function hasLogisticsAccess(companyId: string): Promise<boolean> {
  const rec = await prisma.companyModuleAccess.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey: LOGISTICS_MODULE_KEY } },
    select: { enabled: true },
  });
  return !!rec?.enabled;
}

/** Другите фирми в същата бизнес група (за BG↔MK intercompany). Празно, ако няма група. */
export async function groupCounterparties(companyId: string): Promise<{ id: string; name: string }[]> {
  const me = await prisma.company.findUnique({ where: { id: companyId }, select: { companyGroupId: true } });
  if (!me?.companyGroupId) return [];
  const others = await prisma.company.findMany({
    where: { companyGroupId: me.companyGroupId, id: { not: companyId }, archivedAt: null },
    select: { id: true, name: true }, orderBy: { name: "asc" },
  });
  return others;
}

/** Дали двете фирми са в една и съща бизнес група (за достъп до споделени документи). */
export async function inSameGroup(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const [ca, cb] = await Promise.all([
    prisma.company.findUnique({ where: { id: a }, select: { companyGroupId: true } }),
    prisma.company.findUnique({ where: { id: b }, select: { companyGroupId: true } }),
  ]);
  return !!ca?.companyGroupId && ca.companyGroupId === cb?.companyGroupId;
}

export type LogisticsContext = { userId: string; companyId: string; role: string | null; caps: LogisticsCaps };

/**
 * Guard за страници на модула. Пренасочва към /dashboard, ако активната фирма няма
 * достъп (така модулът НЕ се появява за други клиенти). Връща контекст с права.
 */
export async function requireLogistics(): Promise<LogisticsContext> {
  const { userId, companyId } = await requireCompany();
  if (!(await hasLogisticsAccess(companyId))) redirect("/dashboard");
  // Super Admin (вкл. technical access/импърсонация) не е член на фирмата → getMyRole
  // връща null. Дава му се пълен достъп (по спец. „Super Admin има пълен достъп"),
  // но ЕДВА след като модулът е активиран за фирмата (без пробив в сигурността).
  const role = await getEffectiveRole(userId, companyId);
  if (!canLogistics(role, "view_logistics")) redirect("/dashboard");
  return { userId, companyId, role, caps: logisticsCaps(role) };
}

/** Ролята за проверка на права: Super Admin → „owner" (пълен достъп); иначе реалната. */
async function getEffectiveRole(userId: string, companyId: string): Promise<string | null> {
  const [admin, role] = await Promise.all([isSuperAdmin(userId), getMyRole(userId, companyId)]);
  return effectiveRole(admin, role);
}

// ── API guard: връща JSON 403 вместо redirect. Проверява модул + конкретно право. ──
export type ApiGuardOk = { ok: true; userId: string; companyId: string; role: string | null };
export type ApiGuardFail = { ok: false; res: NextResponse };

export async function logisticsApiGuard(perm: import("@/lib/logistics/perms").LogisticsPermission): Promise<ApiGuardOk | ApiGuardFail> {
  const { userId, companyId } = await requireCompany();
  if (!(await hasLogisticsAccess(companyId))) {
    return { ok: false, res: NextResponse.json({ error: "Няма достъп до модула." }, { status: 403 }) };
  }
  const role = await getEffectiveRole(userId, companyId);
  if (!canLogistics(role, perm)) {
    return { ok: false, res: NextResponse.json({ error: "Недостатъчни права." }, { status: 403 }) };
  }
  return { ok: true, userId, companyId, role };
}
