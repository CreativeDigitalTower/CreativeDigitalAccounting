import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlobBackground } from "@/components/Backgrounds";
import { Sidebar } from "@/components/app/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyUser = await prisma.companyUser.findFirst({
    where: { userId: session.user.id },
    include: {
      company: {
        include: { subscription: true },
      },
    },
    orderBy: { company: { createdAt: "asc" } },
  });

  if (!companyUser) redirect("/onboarding");

  const { company } = companyUser;
  const plan = company.subscription?.plan ?? "free";

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <Sidebar companyName={company.name} plan={plan} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "28px 36px 60px",
            maxWidth: 1180,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
