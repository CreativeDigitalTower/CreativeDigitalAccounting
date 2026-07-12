import { BlobBackground } from "@/components/Backgrounds";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { VisitTracker } from "@/components/VisitTracker";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <VisitTracker area="public" />
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo />
          </Link>
          <LanguageSwitcher />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 32px 60px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
