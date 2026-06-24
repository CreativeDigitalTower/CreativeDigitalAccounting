import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BlobBackground } from "@/components/Backgrounds";
import { Logo } from "@/components/Logo";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Достъп само за регистрирани потребители
  if (!session?.user?.id) redirect("/login?next=/tools");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0 24px", borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
            <Link href="/tools" style={{ textDecoration: "none" }}><Logo /></Link>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <Link href="/dashboard" className="btn btn-ghost btn-sm">Към таблото</Link>
            </div>
          </div>
        </nav>
        <main style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 24px 80px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
