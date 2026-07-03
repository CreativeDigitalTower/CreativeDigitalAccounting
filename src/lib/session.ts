import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { planHasFeature, type PlanId } from "@/lib/constants";

export const IMPERSONATE_COOKIE = "cda_impersonate";

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function getCompanyId(userId: string): Promise<string> {
  // Импърсонация: ако супер админ е "влязъл" в чужда фирма
  const jar = await cookies();
  const impersonate = jar.get(IMPERSONATE_COOKIE)?.value;
  if (impersonate) {
    const admin = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
    if (admin?.isSuperAdmin) {
      const exists = await prisma.company.findUnique({ where: { id: impersonate }, select: { id: true } });
      if (exists) return impersonate;
    }
  }

  const cu = await prisma.companyUser.findFirst({
    where: { userId },
    orderBy: { company: { createdAt: "asc" } },
  });
  if (!cu) redirect("/onboarding");
  return cu.companyId;
}

/** Ролята на текущия потребител в дадена фирма. */
export async function getMyRole(userId: string, companyId: string): Promise<string | null> {
  const cu = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { role: true },
  });
  return cu?.role ?? null;
}

export async function requireCompany() {
  const session = await getSession();
  const userId = session.user!.id as string;
  const companyId = await getCompanyId(userId);
  // Служителите (роля employee) НЯМАТ достъп до бизнес частта — само до своя портал.
  // Централна точка: всички бизнес страници и API маршрути минават оттук.
  const role = await getMyRole(userId, companyId);
  if (role === "employee") redirect("/portal");
  return { userId, companyId };
}

/** Достъп само за роля employee (порталът за самообслужване). Връща свързания служител. */
export async function requireEmployee() {
  const session = await getSession();
  const userId = session.user!.id as string;
  const employee = await prisma.employee.findFirst({
    where: { userId },
    include: { company: { include: { subscription: true } } },
  });
  if (!employee) redirect("/dashboard");
  const plan = (employee.company.subscription?.plan ?? "free") as PlanId;
  if (!planHasFeature(plan, "employee_portal")) redirect("/login?portal=unavailable");
  return { userId, employee, companyId: employee.companyId };
}

/**
 * Достъп до Project Management — за ВСИЧКИ роли на фирмата (вкл. служители).
 * Не пренасочва служителите; проверява плана (Бизнес/Про).
 */
export async function requireProjectAccess() {
  const session = await getSession();
  const userId = session.user!.id as string;
  const companyId = await getCompanyId(userId);
  const role = (await getMyRole(userId, companyId)) ?? "viewer";
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "project_management")) {
    redirect(role === "employee" ? "/portal" : "/dashboard/subscription?locked=project_management");
  }
  return { userId, companyId, role, isEmployee: role === "employee" };
}

export async function requireSuperAdmin() {
  const session = await getSession();
  const userId = session.user!.id as string;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  if (!u?.isSuperAdmin) redirect("/dashboard");
  return { userId };
}

export async function getPlan(companyId: string): Promise<PlanId> {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    select: { plan: true },
  });
  return (sub?.plan ?? "free") as PlanId;
}

/** Спира достъпа до страница, ако планът не включва дадена функция. */
export async function requireFeature(feature: string) {
  const { userId, companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, feature)) {
    redirect("/dashboard/subscription?locked=" + feature);
  }
  return { userId, companyId, plan };
}

/** Спира достъпа, ако фирмата е на безплатен план (само за платени абонаменти). */
export async function requirePaidPlan() {
  const { userId, companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (plan === "free") {
    redirect("/dashboard/subscription?locked=protocols");
  }
  return { userId, companyId, plan };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  return !!u?.isSuperAdmin;
}
