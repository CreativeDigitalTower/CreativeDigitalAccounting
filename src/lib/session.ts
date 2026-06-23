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

export async function requireCompany() {
  const session = await getSession();
  const userId = session.user!.id as string;
  const companyId = await getCompanyId(userId);
  return { userId, companyId };
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

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  return !!u?.isSuperAdmin;
}
