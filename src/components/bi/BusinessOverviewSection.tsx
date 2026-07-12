"use client";

import type { BusinessOverview } from "@/lib/bi/overview";
import { useI18n } from "@/components/i18n/I18nProvider";
import { BiKpiCard } from "./BiKpiCard";
import { TrendArea } from "./TrendArea";
import { HealthGauge } from "./HealthGauge";
import { InsightFeed } from "./InsightFeed";

const TONE_TEXT: Record<string, string> = {
  good: "var(--emerald-dark)", ok: "var(--navy)", attention: "var(--brass)", critical: "var(--brick)",
};

export function BusinessOverviewSection({ data }: { data: BusinessOverview }) {
  const { t, money } = useI18n();
  if (!data.hasData) {
    return (
      <div className="bi-card bi-flat bi-in" style={{ textAlign: "center", padding: "34px 20px", marginBottom: 26 }}>
        <div className="bi-eyebrow" style={{ marginBottom: 8 }}>{t("bi.section.overview")}</div>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{t("bi.section.notEnoughData")}</div>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div>
          <div className="bi-eyebrow">{t("bi.section.overview")}</div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>{t("bi.section.whatsHappening")}</h2>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("bi.section.period6m")}</div>
      </div>

      {/* KPI карти */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 16 }}>
        {data.cards.map((c, i) => <BiKpiCard key={c.key} card={c} index={i} />)}
      </div>

      {/* Тренд график + Здраве */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(240px, 1fr)", gap: 14, marginBottom: 16 }} className="bi-overview-main">
        <div className="bi-card bi-flat bi-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)" }}>{t("bi.section.revExpProfit")}</div>
          </div>
          <TrendArea
            labels={data.monthsLabels}
            series={[
              { name: t("bi.kpi.revenue"), color: "var(--emerald)", data: data.revenueSeries, kind: "area" },
              { name: t("bi.kpi.expenses"), color: "var(--brass)", data: data.expenseSeries, kind: "line" },
              { name: t("bi.kpi.profit"), color: "var(--navy)", data: data.profitSeries, kind: "line" },
            ]}
          />
        </div>
        <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="bi-eyebrow" style={{ color: TONE_TEXT[data.health.tone], alignSelf: "flex-start" }}>{t("bi.section.businessHealth")}</div>
          <HealthGauge score={data.health.score} tone={data.health.tone} />
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 4 }}>{t(data.health.labelKey)}</div>
        </div>
      </div>

      {/* Forecast strip */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span className="bi-eyebrow" style={{ color: "var(--navy)" }}>{t("bi.section.forecastMonth")}</span>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("bi.forecast.pace", { pct: data.forecast.progressPct })}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { l: t("bi.forecast.revenue"), v: money(data.forecast.revenue), c: "var(--emerald-dark)" },
            { l: t("bi.forecast.expenses"), v: money(data.forecast.expenses), c: "var(--brick)" },
            { l: t("bi.forecast.profit"), v: money(data.forecast.profit), c: data.forecast.profit >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
            { l: t("bi.forecast.vat"), v: money(data.forecast.vat), c: "var(--brass)" },
            { l: t("bi.forecast.documents"), v: String(data.forecast.documents), c: "var(--navy)" },
          ].map((f) => (
            <div key={f.l}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{f.l}</div>
              <div className="num" style={{ fontSize: 17, fontWeight: 700, color: f.c }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights / Рискове / Възможности */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <InsightFeed title={t("bi.section.insights")} items={data.insights} eyebrowColor="var(--emerald-dark)" />
        <InsightFeed title={t("bi.section.risks")} items={data.risks} eyebrowColor="var(--brick)" />
        <InsightFeed title={t("bi.section.opportunities")} items={data.opportunities} eyebrowColor="var(--brass)" />
      </div>
    </section>
  );
}
