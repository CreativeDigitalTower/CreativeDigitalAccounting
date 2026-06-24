"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { planHasFeature, type PlanId } from "@/lib/constants";

const navItems = [
  { href: "/dashboard", label: "Табло", icon: "⊞", feature: "dashboard" },
  { href: "/dashboard/invoices", label: "Фактури", icon: "🧾", feature: "documents" },
  { href: "/dashboard/documents", label: "Документи", icon: "📄", feature: "documents" },
  { href: "/dashboard/clients", label: "Клиенти", icon: "👥", feature: "clients" },
  { href: "/dashboard/suppliers", label: "Доставчици", icon: "🚚", feature: "suppliers" },
  { href: "/dashboard/warehouse", label: "Склад", icon: "📦", feature: "warehouse" },
  { href: "/dashboard/cash", label: "Каса", icon: "🏦", feature: "cash" },
  { href: "/dashboard/expenses", label: "Разходи", icon: "💰", feature: "expenses" },
  { href: "/dashboard/contracts", label: "Договори", icon: "📑", feature: "contracts" },
  { href: "/dashboard/projects", label: "Проекти", icon: "🏗️", feature: "projects" },
  { href: "/dashboard/archive", label: "Архив", icon: "🗂️", feature: "archive" },
  { href: "/dashboard/assets", label: "Активи", icon: "🏭", feature: "assets" },
  { href: "/dashboard/analytics", label: "Анализи", icon: "📊", feature: "analytics" },
  { href: "/dashboard/tools", label: "Безплатни инструменти", icon: "🧮", feature: "dashboard" },
  { href: "/dashboard/users", label: "Потребители", icon: "👤", feature: "users" },
  { href: "/dashboard/audit", label: "Одит лог", icon: "📜", feature: "audit" },
  { href: "/dashboard/settings", label: "Профил на фирмата", icon: "⚙️", feature: "dashboard" },
  { href: "/dashboard/subscription", label: "Абонамент", icon: "💳", feature: "dashboard" },
];

interface SidebarProps {
  companyName: string;
  plan: string;
  isSuperAdmin?: boolean;
  logoUrl?: string | null;
}

export function Sidebar({ companyName, plan, isSuperAdmin, logoUrl }: SidebarProps) {
  const pathname = usePathname();
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
          АКТИВНА ФИРМА <span style={{ opacity: .7 }}>✎</span>
        </div>
        {logoUrl && (
          <div style={{ background: "#fff", borderRadius: 6, padding: 6, marginBottom: 8, display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName} style={{ maxHeight: 36, maxWidth: "100%", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ fontWeight: 600, color: "#E9E7DA", fontSize: 13 }}>{companyName}</div>
      </Link>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const locked = !planHasFeature(planId, item.feature);
          const href = locked ? "/dashboard/subscription" : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              title={locked ? "Достъпно в по-висок план" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "8.5px 12px",
                borderRadius: 6,
                fontSize: 13.3,
                fontWeight: 500,
                color: isActive ? "#fff" : locked ? "rgba(201,199,182,.45)" : "#C9C7B6",
                textDecoration: "none",
                background: isActive ? "rgba(255,255,255,.12)" : "transparent",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive && !locked) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !locked) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#C9C7B6";
                }
              }}
            >
              <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
              {item.label}
              {locked && (
                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.6 }} aria-label="заключено">🔒</span>
              )}
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link
            href="/dashboard/admin"
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "8.5px 12px",
              borderRadius: 6, fontSize: 13.3, fontWeight: 600, marginTop: 6,
              color: pathname.startsWith("/dashboard/admin") ? "#fff" : "var(--brass)",
              textDecoration: "none",
              background: pathname.startsWith("/dashboard/admin") ? "rgba(166,130,47,.3)" : "rgba(166,130,47,.12)",
              border: "1px solid rgba(166,130,47,.4)",
            }}
          >
            <span style={{ fontSize: 15 }}>🛡️</span>
            Супер Админ
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
          <span style={{ fontSize: 15, opacity: 0.4 }}>🤖</span>
          AI Асистент
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
            СКОРО
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
          план
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
            Изход ↗
          </button>
        </form>
      </div>
    </aside>
  );
}
