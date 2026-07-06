import Link from "next/link";
import { requireAccountingFirm } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Logo } from "@/components/Logo";
import { PortalSignOut } from "@/components/app/PortalSignOut";
import { accountantPlanLabel } from "@/lib/constants";

export default async function FirmLayout({ children }: { children: React.ReactNode }) {
  const { firm } = await requireAccountingFirm();
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "18px 24px 60px" }}>
        <div className="glass panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", marginBottom: 20 }}>
          <Logo />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 12, padding: "2px 9px" }}>СЧЕТОВОДНА КЪЩА</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{firm.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{accountantPlanLabel(firm.firmPlan)}</div>
            </div>
            <Link href="/firm/subscription" className="btn btn-ghost btn-sm">Абонамент</Link>
            <PortalSignOut />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
