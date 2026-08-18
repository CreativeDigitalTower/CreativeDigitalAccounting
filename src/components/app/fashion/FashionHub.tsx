"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_NAV, FASHION_BASE_PATH } from "@/lib/fashion/config";
import type { FashionCaps } from "@/lib/fashion/perms";

const READY = new Set(["dashboard", "settings", "materials", "deliveries", "styles", "patterns", "bom", "operations", "cutting", "production", "qc", "finishedGoods", "costing", "sales", "analytics"]);

type Dash = {
  materials: { value: number; lowStockCount: number };
  production: { cut: number; inProduction: number; forQc: number; defective: number; forRepair: number; defectRate: number };
  finishedGoods: { readyForSale: number; cost: number; retail: number };
  sales: { revenue: number; cogs: number; grossProfit: number; units: number };
  topSellers: { sku: string; sold: number }[];
  slowMovers: { sku: string; available: number; sold: number }[];
};

export function FashionHub({ caps }: { caps: FashionCaps }) {
  const t = useT();
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { fetch("/api/fashion/dashboard").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);

  const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="glass panel" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 1040 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>{t("fashion.title")}</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>{t("fashion.intro")}</p>

      {d && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 18 }}>
          <Kpi label={t("fashion.dash.materialsValue")} value={`${d.materials.value.toFixed(2)} €`} sub={`${d.materials.lowStockCount} ${t("fashion.dash.lowStock")}`} />
          <Kpi label={t("fashion.dash.inProduction")} value={String(d.production.inProduction)} sub={`${t("fashion.dash.forQc")}: ${d.production.forQc}`} />
          <Kpi label={t("fashion.dash.defectRate")} value={`${d.production.defectRate}%`} sub={`${t("fashion.prod.defective")}: ${d.production.defective}`} />
          <Kpi label={t("fashion.dash.readyForSale")} value={String(d.finishedGoods.readyForSale)} sub={`${d.finishedGoods.cost.toFixed(0)} € / ${d.finishedGoods.retail.toFixed(0)} €`} />
          <Kpi label={t("fashion.dash.monthRevenue")} value={`${d.sales.revenue.toFixed(2)} €`} sub={`${t("fashion.sales.grossProfit")}: ${d.sales.grossProfit.toFixed(2)} €`} />
        </div>
      )}

      {d && (d.topSellers.length > 0 || d.slowMovers.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 6px" }}>{t("fashion.dash.topSelling")}</h3>
            {d.topSellers.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : d.topSellers.map((s) => (
              <div key={s.sku} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}><span className="num">{s.sku}</span><span className="num">{s.sold}</span></div>
            ))}
          </div>
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 6px" }}>{t("fashion.dash.slowMoving")}</h3>
            {d.slowMovers.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : d.slowMovers.map((s) => (
              <div key={s.sku} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}><span className="num">{s.sku}</span><span style={{ color: "var(--muted)" }}>{t("fashion.fg.available")} {s.available} · {t("fashion.fg.sold")} {s.sold}</span></div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
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

      {!caps.manage_settings && <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 16 }}>{t("fashion.limitedRole")}</p>}
    </div>
  );
}
