"use client";

import Link from "next/link";
import type { AnalyticsData } from "@/lib/bi/analytics";
import { useI18n } from "@/components/i18n/I18nProvider";
import { BiKpiCard } from "./BiKpiCard";
import { TrendArea } from "./TrendArea";
import { HealthGauge } from "./HealthGauge";
import { InsightFeed } from "./InsightFeed";
import { TopClientsTable } from "./TopClientsTable";

const TONE_TEXT: Record<string, string> = { good: "var(--emerald-dark)", ok: "var(--navy)", attention: "var(--brass)", critical: "var(--brick)" };

export function AnalyticsOverview({ data }: { data: AnalyticsData }) {
  const { t, money } = useI18n();
  if (!data.hasData) {
    return (
      <div className="bi-card bi-flat bi-in" style={{ textAlign: "center", padding: "40px 20px", marginBottom: 22 }}>
        <div className="bi-eyebrow" style={{ marginBottom: 8 }}>{t("bi.section.overview")}</div>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{t("bi.section.notEnoughPeriod")}</div>
      </div>
    );
  }

  const pay = data.payments;
  return (
    <div>
      {/* KPI карти */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
        {data.cards.map((c, i) => <BiKpiCard key={c.key} card={c} index={i} />)}
      </div>

      {/* Тренд + Здраве */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(240px, 1fr)", gap: 14, marginBottom: 16 }} className="bi-overview-main">
        <div className="bi-card bi-flat bi-in">
          <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)", marginBottom: 8 }}>{t("bi.section.revExpProfit")}</div>
          <TrendArea labels={data.trend.labels} series={[
            { name: t("bi.kpi.revenue"), color: "var(--emerald)", data: data.trend.revenue, kind: "area" },
            { name: t("bi.kpi.expenses"), color: "var(--brass)", data: data.trend.expenses, kind: "line" },
            { name: t("bi.kpi.profit"), color: "var(--navy)", data: data.trend.profit, kind: "line" },
          ]} />
        </div>
        <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div className="bi-eyebrow" style={{ color: TONE_TEXT[data.health.tone], alignSelf: "flex-start" }}>{t("bi.section.businessHealth")}</div>
          <HealthGauge score={data.health.score} tone={data.health.tone} />
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 2 }}>{t(data.health.label)}</div>
        </div>
      </div>

      {/* Плащания / просрочени */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
        <div className="bi-eyebrow" style={{ color: "var(--navy)", marginBottom: 12 }}>{t("bi.section.payments")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { l: t("bi.payments.paid"), v: money(pay.paidAmount), s: t("bi.payments.invoicesCount", { count: pay.paidCount }), c: "var(--emerald-dark)" },
            { l: t("bi.payments.unpaid"), v: money(pay.unpaidAmount), s: t("bi.payments.invoicesCount", { count: pay.unpaidCount }), c: "var(--brass)" },
            { l: t("bi.payments.overdue"), v: money(pay.overdueAmount), s: t("bi.payments.invoicesCount", { count: pay.overdueCount }), c: pay.overdueCount ? "var(--brick)" : "var(--ink)" },
          ].map((k) => (
            <div key={k.l}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{k.l}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{k.s}</div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {pay.overdueCount > 0
              ? <Link href="/dashboard/invoices?status=overdue" className="btn btn-primary btn-sm">{t("bi.payments.collectOverdue")}</Link>
              : <span style={{ fontSize: 12, color: "var(--emerald-dark)", fontWeight: 600 }}>{t("bi.payments.noOverdue")}</span>}
          </div>
        </div>
      </div>

      {/* Прогноза */}
      {data.forecast && (
        <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span className="bi-eyebrow" style={{ color: "var(--navy)" }}>{t("bi.section.forecastPeriod")}</span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("bi.forecast.pacePeriod", { pct: data.forecast.progressPct })}</span>
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
      )}

      {/* Insights / Рискове / Възможности */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 16 }}>
        <InsightFeed title={t("bi.section.insights")} items={data.insights} eyebrowColor="var(--emerald-dark)" />
        <InsightFeed title={t("bi.section.risks")} items={data.risks} eyebrowColor="var(--brick)" />
        <InsightFeed title={t("bi.section.opportunities")} items={data.opportunities} eyebrowColor="var(--brass)" />
      </div>

      {/* Топ клиенти таблица */}
      <div style={{ marginBottom: 16 }}>
        <TopClientsTable rows={data.topClients} />
      </div>
    </div>
  );
}
