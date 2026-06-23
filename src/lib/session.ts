import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { planHasFeature, type PlanId } from "@/lib/constants";

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function getCompanyId(userId: string): Promise<string> {
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
