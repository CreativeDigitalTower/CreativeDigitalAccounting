import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BlobBackground } from "@/components/Backgrounds";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { VisitTracker } from "@/components/VisitTracker";

// Безплатните инструменти са достъпни само за регистрирани потребители,
// но запазват менюто на сайта (логото води към началната страница).
export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/tools");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <VisitTracker area="public" />
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <MarketingNavbar />
        <main style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 24px 80px" }}>
          {children}
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
