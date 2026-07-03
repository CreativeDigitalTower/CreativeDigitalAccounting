import Link from "next/link";
import { requireEmployee } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Logo } from "@/components/Logo";
import { PortalSignOut } from "@/components/app/PortalSignOut";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { planHasFeature, type PlanId } from "@/lib/constants";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Гарантира, че само роля employee (с активен план Бизнес/Про) вижда портала.
  const { employee } = await requireEmployee();
  const access = parseEmployeeAccess(employee.company.employeeAccess);
  const hasPm = planHasFeature((employee.company.subscription?.plan ?? "free") as PlanId, "project_management");
  const tabs = [
    { href: "/portal", label: "Моят профил", on: true },
    { href: "/portal/pm", label: "Project Management", on: hasPm },
    { href: "/portal/clients", label: "Клиенти", on: access.clients },
    { href: "/portal/projects", label: "Проекти", on: access.projects },
    { href: "/portal/suppliers", label: "Доставчици", on: access.suppliers },
    { href: "/portal/warehouse", label: "Склад", on: access.warehouse },
  ].filter((t) => t.on);

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
        {tabs.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {tabs.map((t) => <Link key={t.href} href={t.href} className="filter-tab">{t.label}</Link>)}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
