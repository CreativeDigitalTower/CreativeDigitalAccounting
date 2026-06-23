import { BlobBackground } from "@/components/Backgrounds";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ padding: "20px 32px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo />
          </Link>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 32px 60px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
