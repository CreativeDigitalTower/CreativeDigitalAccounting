"use client";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_NAV, FASHION_BASE_PATH } from "@/lib/fashion/config";
import type { FashionCaps } from "@/lib/fashion/perms";

// Началната страница (hub) на модула. Разделите се разгръщат в следващите фази —
// засега води само към готовите (Табло/Настройки), останалите са „предстои".
const READY = new Set(["dashboard", "settings", "materials", "deliveries", "styles", "patterns", "bom", "operations", "cutting"]);

export function FashionHub({ caps }: { caps: FashionCaps }) {
  const t = useT();
  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>{t("fashion.title")}</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>{t("fashion.intro")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {FASHION_NAV.filter((s) => s.key !== "dashboard").map((s) => {
          const ready = READY.has(s.key);
          const inner = (
            <div className="glass panel" style={{ padding: "16px 18px", height: "100%", opacity: ready ? 1 : 0.6 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t(`fashion.nav.${s.key}`)}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{ready ? t("fashion.open") : t("fashion.comingSoon")}</div>
            </div>
          );
          return ready
            ? <Link key={s.key} href={`${FASHION_BASE_PATH}${s.path}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>
            : <div key={s.key}>{inner}</div>;
        })}
      </div>

      {!caps.manage_settings && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 16 }}>{t("fashion.limitedRole")}</p>
      )}
    </div>
  );
}
