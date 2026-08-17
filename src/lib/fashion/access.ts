/**
 * Достъп до модул „Модно производство" (Fashion Production).
 *
 * Огледален на логистичния механизъм: CompanyModuleAccess (per-company, database-
 * driven). Няма hardcode на ЕИК и няма implicit достъп през group ID — всяка фирма
 * има собствен enabled запис. Всички проверки са server-side и permission-scoped.
 */
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireCompany, getMyRole, isSuperAdmin } from "@/lib/session";
import { FASHION_MODULE_KEY } from "@/lib/fashion/config";
import { canFashion, fashionCaps, effectiveFashionRole, type FashionCaps, type FashionPermission } from "@/lib/fashion/perms";

export { canFashion, fashionCaps };
export type { FashionPermission, FashionCaps } from "@/lib/fashion/perms";

/** Дали фирмата има активиран достъп до модула (database-driven). */
export async function hasFashionAccess(companyId: string): Promise<boolean> {
  const rec = await prisma.companyModuleAccess.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey: FASHION_MODULE_KEY } },
    select: { enabled: true },
  });
  return !!rec?.enabled;
}

/** Ролята за проверка на права: Super Admin → „owner" (пълен достъп); иначе реалната. */
async function getEffectiveRole(userId: string, companyId: string): Promise<string | null> {
  const [admin, role] = await Promise.all([isSuperAdmin(userId), getMyRole(userId, companyId)]);
  return effectiveFashionRole(admin, role);
}

export type FashionContext = { userId: string; companyId: string; role: string | null; caps: FashionCaps };

/**
 * Guard за страници на модула. Пренасочва към /dashboard, ако активната фирма няма
 * достъп (така модулът НЕ се появява за други клиенти). Връща контекст с права.
 */
export async function requireFashionProduction(): Promise<FashionContext> {
  const { userId, companyId } = await requireCompany();
  if (!(await hasFashionAccess(companyId))) redirect("/dashboard");
  const role = await getEffectiveRole(userId, companyId);
  if (!canFashion(role, "view_fashion")) redirect("/dashboard");
  return { userId, companyId, role, caps: fashionCaps(role) };
}

// ── API guard: връща JSON 403 вместо redirect. Проверява модул + конкретно право. ──
export type ApiGuardOk = { ok: true; userId: string; companyId: string; role: string | null };
export type ApiGuardFail = { ok: false; res: NextResponse };

export async function fashionApiGuard(perm: FashionPermission): Promise<ApiGuardOk | ApiGuardFail> {
  const { userId, companyId } = await requireCompany();
  if (!(await hasFashionAccess(companyId))) {
    return { ok: false, res: NextResponse.json({ error: "Няма достъп до модула." }, { status: 403 }) };
  }
  const role = await getEffectiveRole(userId, companyId);
  if (!canFashion(role, perm)) {
    return { ok: false, res: NextResponse.json({ error: "Недостатъчни права." }, { status: 403 }) };
  }
  return { ok: true, userId, companyId, role };
}

/** Зарежда (или създава по подразбиране) настройките на модула за фирмата. */
export async function getFashionSettings(companyId: string) {
  const { FASHION_DEFAULTS } = await import("@/lib/fashion/config");
  return prisma.fashionSettings.upsert({
    where: { companyId },
    create: { companyId, ...FASHION_DEFAULTS },
    update: {},
  });
}
