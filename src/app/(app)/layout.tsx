import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyId, IMPERSONATE_COOKIE } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Sidebar } from "@/components/app/Sidebar";
import { AppTopBar } from "@/components/app/AppTopBar";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";
import { VisitTracker } from "@/components/VisitTracker";
import { TrialEndedPopup } from "@/components/app/TrialEndedPopup";
import { enforceSubscription } from "@/lib/subscription";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const companyId = await getCompanyId(userId);

  const [company, me, jar, sub, inboxUnread] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } }),
    cookies(),
    enforceSubscription(companyId), // авто-връщане към БЕЗПЛАТЕН при изтекъл абонамент
    prisma.notification.count({ where: { companyId, read: false } }).catch(() => 0),
  ]);

  if (!company) redirect("/onboarding");

  const plan = sub.plan;
  const isSuperAdmin = !!me?.isSuperAdmin;
  const impersonating = isSuperAdmin && !!jar.get(IMPERSONATE_COOKIE)?.value;

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <VisitTracker area="app" />
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <Sidebar companyName={company.name} plan={plan} isSuperAdmin={isSuperAdmin} logoUrl={plan !== "free" ? company.logoUrl : null} inboxUnread={inboxUnread} />
        <main style={{ flex: 1, minWidth: 0, maxWidth: 1180 }}>
          {impersonating && <ImpersonationBanner companyName={company.name} />}
          {sub.justExpired && <TrialEndedPopup wasTrial={sub.wasTrial} periodEnd={sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : ""} />}
          <AppTopBar initialUnread={inboxUnread} />
          <div style={{ padding: "14px 36px 60px" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
