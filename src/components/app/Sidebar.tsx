"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { planHasFeature, type PlanId } from "@/lib/constants";
import { NavIcon } from "@/components/app/NavIcons";
import { useT } from "@/components/i18n/I18nProvider";

// Навигацията е групирана в логични сектори за по-ясен и структуриран изглед.
const navGroups: { title: string; titleKey: string; items: { href: string; label: string; icon: string; feature: string; tKey: string }[] }[] = [
  {
    title: "Общ преглед", titleKey: "navigation.groups.overview",
    items: [
      { href: "/dashboard", label: "Табло", icon: "dashboard", feature: "dashboard", tKey: "navigation.dashboard" },
      { href: "/dashboard/pm", label: "Project Management", icon: "projects", feature: "project_management", tKey: "navigation.projectManagement" },
      { href: "/dashboard/analytics", label: "Анализи", icon: "analytics", feature: "analytics", tKey: "navigation.analytics" },
    ],
  },
  {
    title: "Продажби и клиенти", titleKey: "navigation.groups.sales",
    items: [
      { href: "/dashboard/invoices", label: "Фактури", icon: "invoice", feature: "documents", tKey: "navigation.invoices" },
      { href: "/dashboard/documents", label: "Документи", icon: "document", feature: "documents", tKey: "navigation.documents" },
      { href: "/dashboard/business-docs", label: "Бизнес документи", icon: "businessDocs", feature: "dashboard", tKey: "navigation.businessDocs" },
      { href: "/dashboard/clients", label: "Клиенти (CRM)", icon: "clients", feature: "clients", tKey: "navigation.clients" },
      { href: "/dashboard/inbox", label: "Входящи документи", icon: "inbox", feature: "dashboard", tKey: "navigation.inbox" },
    ],
  },
  {
    title: "Финанси", titleKey: "navigation.groups.finance",
    items: [
      { href: "/dashboard/cash", label: "Каса", icon: "cash", feature: "cash", tKey: "navigation.cash" },
      { href: "/dashboard/expenses", label: "Разходи", icon: "expenses", feature: "expenses", tKey: "navigation.expenses" },
      { href: "/dashboard/contracts", label: "Договори", icon: "contracts", feature: "contracts", tKey: "navigation.contracts" },
      { href: "/dashboard/tax-calendar", label: "Данъчен календар", icon: "calendar", feature: "tax_calendar", tKey: "navigation.taxCalendar" },
      { href: "/dashboard/saft", label: "SAF-T", icon: "audit", feature: "saft", tKey: "navigation.saft" },
    ],
  },
  {
    title: "Операции", titleKey: "navigation.groups.operations",
    items: [
      { href: "/dashboard/suppliers", label: "Доставчици", icon: "suppliers", feature: "suppliers", tKey: "navigation.suppliers" },
      { href: "/dashboard/warehouse", label: "Склад", icon: "warehouse", feature: "warehouse", tKey: "navigation.warehouse" },
      { href: "/dashboard/production", label: "Производство", icon: "production", feature: "production", tKey: "navigation.production" },
      { href: "/dashboard/haccp", label: "HACCP", icon: "haccp", feature: "haccp", tKey: "navigation.haccp" },
      { href: "/dashboard/projects", label: "Проекти", icon: "projects", feature: "projects", tKey: "navigation.projects" },
      { href: "/dashboard/assets", label: "Активи", icon: "assets", feature: "assets", tKey: "navigation.assets" },
    ],
  },
  {
    title: "Екип", titleKey: "navigation.groups.team",
    items: [
      { href: "/dashboard/employees", label: "Служители", icon: "employees", feature: "employees", tKey: "navigation.employees" },
      { href: "/dashboard/users", label: "Потребители", icon: "users", feature: "users", tKey: "navigation.users" },
    ],
  },
  {
    title: "Още", titleKey: "navigation.groups.more",
    items: [
      { href: "/dashboard/archive", label: "Архив", icon: "archive", feature: "archive", tKey: "navigation.archive" },
      { href: "/dashboard/tools", label: "Безплатни инструменти", icon: "tools", feature: "dashboard", tKey: "navigation.tools" },
      { href: "/dashboard/training", label: "Обучения", icon: "training", feature: "dashboard", tKey: "navigation.training" },
      { href: "/dashboard/audit", label: "Одит лог", icon: "audit", feature: "audit", tKey: "navigation.audit" },
    ],
  },
  {
    title: "Профил", titleKey: "navigation.groups.profile",
    items: [
      { href: "/dashboard/settings", label: "Профил на фирмата", icon: "settings", feature: "dashboard", tKey: "navigation.settings" },
      { href: "/dashboard/subscription", label: "Абонамент", icon: "subscription", feature: "dashboard", tKey: "navigation.subscription" },
    ],
  },
];

interface SidebarProps {
  companyName: string;
  plan: string;
  isSuperAdmin?: boolean;
  logoUrl?: string | null;
  inboxUnread?: number;
}

export function Sidebar({ companyName, plan, isSuperAdmin, logoUrl, inboxUnread = 0 }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const planId = plan as PlanId;

  return (
    <aside
      className="sidebar-glass"
      style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "22px 16px",
        gap: 22,
        color: "#E9E7DA",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "0 4px" }}>
        <Logo dark />
      </div>

      {/* Company chip — links to company profile */}
      <Link
        href="/dashboard/settings"
        title="Профил на фирмата"
        style={{
          display: "block",
          background: "rgba(255,255,255,.06)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12.5,
          color: "#C9C7B6",
          border: "1px solid rgba(255,255,255,.08)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.1)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.06)")}
      >
        <div style={{ fontSize: 10.5, color: "var(--brass)", fontWeight: 600, letterSpacing: 1, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {t("navigation.activeCompany")}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .7 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </div>
        {logoUrl && (
          <div style={{ background: "#fff", borderRadius: 6, padding: 6, marginBottom: 8, display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName} style={{ maxHeight: 36, maxWidth: "100%", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ fontWeight: 600, color: "#E9E7DA", fontSize: 13 }}>{companyName}</div>
      </Link>

      {/* Navigation — групирана по сектори */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {navGroups.map((group) => (
          <div key={group.title} className="sb-group">
            <div className="sb-group-title">{t(group.titleKey)}</div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const locked = !planHasFeature(planId, item.feature);
              const href = locked ? "/dashboard/subscription" : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  title={locked ? "Достъпно в по-висок план" : undefined}
                  className={`sb-link${isActive ? " sb-active" : ""}${locked ? " sb-locked" : ""}`}
                >
                  <span className="sb-icon">{NavIcon[item.icon]?.({ width: 17, height: 17 })}</span>
                  <span className="sb-label">{t(item.tKey)}</span>
                  {item.href === "/dashboard/inbox" && inboxUnread > 0 && !locked && (
                    <span className="sb-badge">{inboxUnread}</span>
                  )}
                  {locked && (
                    <span className="sb-lock" aria-label="заключено">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {isSuperAdmin && (
          <Link
            href="/dashboard/admin"
            className={`sb-link sb-admin${pathname.startsWith("/dashboard/admin") ? " sb-admin-active" : ""}`}
          >
            <span className="sb-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5 4.5 5.5V11c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V5.5L12 2.5Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <span className="sb-label">{t("navigation.superAdmin")}</span>
          </Link>
        )}

        {/* AI Copilot locked teaser */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "8.5px 12px",
            borderRadius: 6,
            fontSize: 13.3,
            fontWeight: 500,
            color: "rgba(201,199,182,.4)",
            cursor: "default",
            position: "relative",
          }}
        >
          <span style={{ display: "inline-flex", opacity: 0.4 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="7.5" width="15" height="11" rx="2.5" /><path d="M12 4.5v3M9 12.5h.01M15 12.5h.01M9.5 16h5" /><path d="M2.5 11.5v3M21.5 11.5v3" /></svg>
          </span>
          {t("navigation.aiAssistant")}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 9.5,
              color: "var(--brass)",
              border: "1px solid var(--brass)",
              borderRadius: 10,
              padding: "1px 7px",
              opacity: 0.7,
            }}
          >
            {t("navigation.soon")}
          </span>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            color: "#C9C7B6",
            background: "rgba(255,255,255,.07)",
            padding: "4px 9px",
            borderRadius: 20,
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--brass)", fontWeight: 700 }}>
            {plan === "free" ? "Безплатен" : plan === "start" ? "Старт" : plan === "business" ? "Бизнес" : "Про"}
          </span>{" "}
          {t("navigation.plan")}
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              color: "#8A8878",
              fontSize: 12.5,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            {t("navigation.signOut")} ↗
          </button>
        </form>
      </div>
    </aside>
  );
}
