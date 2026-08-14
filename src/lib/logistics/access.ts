/**
 * Достъп до модул „Търговия, доставки и логистика" (корекции 1, 2, 4).
 *
 * Един database-driven механизъм: CompanyModuleAccess (per-company). НЯМА hardcode
 * на ЕИК и НЯМА implicit достъп през group ID — всяка фирма трябва да има собствен
 * enabled запис. Всички проверки са server-side и permission-scoped.
 */
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireCompany, getMyRole } from "@/lib/session";
import { LOGISTICS_MODULE_KEY } from "@/lib/logistics/config";
import { canLogistics, logisticsCaps, type LogisticsCaps } from "@/lib/logistics/perms";

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

export type LogisticsContext = { userId: string; companyId: string; role: string | null; caps: LogisticsCaps };

/**
 * Guard за страници на модула. Пренасочва към /dashboard, ако активната фирма няма
 * достъп (така модулът НЕ се появява за други клиенти). Връща контекст с права.
 */
export async function requireLogistics(): Promise<LogisticsContext> {
  const { userId, companyId } = await requireCompany();
  if (!(await hasLogisticsAccess(companyId))) redirect("/dashboard");
  const role = await getMyRole(userId, companyId);
  if (!canLogistics(role, "view_logistics")) redirect("/dashboard");
  return { userId, companyId, role, caps: logisticsCaps(role) };
}
