import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyId, IMPERSONATE_COOKIE } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Sidebar } from "@/components/app/Sidebar";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const companyId = await getCompanyId(userId);

  const [company, me, jar] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } }),
    cookies(),
  ]);

  if (!company) redirect("/onboarding");

  const plan = company.subscription?.plan ?? "free";
  const isSuperAdmin = !!me?.isSuperAdmin;
  const impersonating = isSuperAdmin && !!jar.get(IMPERSONATE_COOKIE)?.value;

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <Sidebar companyName={company.name} plan={plan} isSuperAdmin={isSuperAdmin} logoUrl={plan !== "free" ? company.logoUrl : null} />
        <main style={{ flex: 1, minWidth: 0, maxWidth: 1180 }}>
          {impersonating && <ImpersonationBanner companyName={company.name} />}
          <div style={{ padding: "28px 36px 60px" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
