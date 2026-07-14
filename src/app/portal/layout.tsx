import Link from "next/link";
import { requireEmployee } from "@/lib/session";
import { BlobBackground } from "@/components/Backgrounds";
import { Logo } from "@/components/Logo";
import { PortalSignOut } from "@/components/app/PortalSignOut";
import { parseEmployeeAccess } from "@/lib/employeeAccess";
import { planHasFeature, type PlanId } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  // Гарантира, че само роля employee (с активен план Бизнес/Про) вижда портала.
  const { employee } = await requireEmployee();
  const access = parseEmployeeAccess(employee.company.employeeAccess);
  const hasPm = planHasFeature((employee.company.subscription?.plan ?? "free") as PlanId, "project_management");
  const tabs = [
    { href: "/portal", label: t("portal.layout.tabs.profile"), on: true },
    { href: "/portal/pm", label: t("portal.layout.tabs.pm"), on: hasPm },
    { href: "/portal/clients", label: t("portal.layout.tabs.clients"), on: access.clients },
    { href: "/portal/projects", label: t("portal.layout.tabs.projects"), on: access.projects },
    { href: "/portal/suppliers", label: t("portal.layout.tabs.suppliers"), on: access.suppliers },
    { href: "/portal/warehouse", label: t("portal.layout.tabs.warehouse"), on: access.warehouse },
  ].filter((x) => x.on);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "18px 20px 60px" }}>
        <div className="glass panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", marginBottom: 18 }}>
          <Logo />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("portal.layout.employeeOf", { company: employee.company.name })}</div>
            </div>
            <PortalSignOut />
          </div>
        </div>
        {tabs.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {tabs.map((x) => <Link key={x.href} href={x.href} className="filter-tab">{x.label}</Link>)}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
