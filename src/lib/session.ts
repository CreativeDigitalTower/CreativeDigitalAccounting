import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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
