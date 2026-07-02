import { requireEmployee } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Logo } from "@/components/Logo";
import { PortalSignOut } from "@/components/app/PortalSignOut";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Гарантира, че само роля employee (с активен план Бизнес/Про) вижда портала.
  const { employee } = await requireEmployee();

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "18px 20px 60px" }}>
        <div className="glass panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", marginBottom: 18 }}>
          <Logo />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Служител · {employee.company.name}</div>
            </div>
            <PortalSignOut />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
