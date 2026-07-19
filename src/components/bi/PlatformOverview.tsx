import Link from "next/link";
import type { PlatformOverview as POData } from "@/lib/bi/platform";
import { BiKpiCard } from "./BiKpiCard";
import { TrendArea } from "./TrendArea";
import { HealthGauge } from "./HealthGauge";
import { InsightFeed } from "./InsightFeed";
import { BiIcon } from "./BiIcon";
import { getT } from "@/lib/i18n/server";
import { PLATFORM_NAME } from "@/lib/constants";

const TONE_TEXT: Record<string, string> = { good: "var(--emerald-dark)", ok: "var(--navy)", attention: "var(--brass)", critical: "var(--brick)" };

const QUICK_ACTIONS = [
  { key: "qEmails", href: "/dashboard/admin/emails" },
  { key: "qBusinesses", href: "/dashboard/admin/businesses" },
  { key: "qAwaiting", href: "#awaiting" },
  { key: "qFirms", href: "#firms" },
  { key: "qBlog", href: "/dashboard/admin/blog" },
];

export async function PlatformOverview({ data }: { data: POData }) {
  const { t } = await getT();
  const maxPlan = Math.max(1, ...data.planDistribution.map((p) => p.value));

  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="bi-eyebrow">{t("platformbi.chrome.eyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>{t("platformbi.chrome.statusOf", { name: PLATFORM_NAME })}</h2>
      </div>

      {/* KPI карти */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        {data.cards.map((c, i) => <BiKpiCard key={c.key} card={c} index={i} />)}
      </div>

      {/* Здраве + Регистрации + План разпределение */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(0, 1.5fr) minmax(220px, 1fr)", gap: 14, marginBottom: 16 }} className="bi-overview-main">
        <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div className="bi-eyebrow" style={{ color: data.health ? TONE_TEXT[data.health.tone] : "var(--muted)", alignSelf: "flex-start" }}>{t("platformbi.chrome.healthTitle")}</div>
          {data.health ? (
            <>
              <HealthGauge score={data.health.score} tone={data.health.tone} />
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{data.health.label}</div>
            </>
          ) : <div style={{ fontSize: 13, color: "var(--muted)", padding: "34px 0" }}>{t("platformbi.chrome.noHealthData")}</div>}
        </div>
        <div className="bi-card bi-flat bi-in">
          <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)", marginBottom: 8 }}>{t("platformbi.chrome.regTitle")}</div>
          <TrendArea labels={data.registrations.labels} series={[{ name: t("platformbi.chrome.newFirms"), color: "var(--emerald)", data: data.registrations.data, kind: "area" }]} height={200} />
        </div>
        <div className="bi-card bi-flat bi-in">
          <div className="bi-eyebrow" style={{ color: "var(--navy)", marginBottom: 12 }}>{t("platformbi.chrome.planTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.planDistribution.map((p) => (
              <div key={p.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "var(--ink-soft)" }}>{p.label}</span>
                  <span className="num" style={{ fontWeight: 700 }}>{p.value}</span>
                </div>
                <div style={{ height: 8, background: "rgba(20,30,25,.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div className="bi-sweep" style={{ height: "100%", width: `${(p.value / maxPlan) * 100}%`, background: p.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Изисква внимание */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16, borderLeft: "3px solid var(--brass)" }}>
        <div className="bi-eyebrow" style={{ color: "var(--brass)", marginBottom: 6 }}>{t("platformbi.chrome.attentionTitle")}</div>
        <div>
          {data.attention.map((a, i) => (
            <div key={i} className="bi-insight">
              <span className={`bi-dot ${a.severity}`} style={{ marginTop: 5 }} />
              <span className="ico"><BiIcon name={a.icon} size={15} /></span>
              <span style={{ fontSize: 12.7, color: "var(--ink-soft)", lineHeight: 1.5, flex: 1 }}>
                {a.text}{a.date ? <span style={{ color: "var(--muted)" }}> · {a.date}</span> : null}
              </span>
              {a.href && a.cta && <Link href={a.href} style={{ fontSize: 12, fontWeight: 700, color: "var(--emerald-dark)", textDecoration: "none", whiteSpace: "nowrap" }}>{a.cta} →</Link>}
            </div>
          ))}
        </div>
      </div>

      {/* Insights + Възможности */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 16 }}>
        <InsightFeed title={t("platformbi.chrome.insightsTitle")} items={data.insights} eyebrowColor="var(--emerald-dark)" />
        <InsightFeed title={t("platformbi.chrome.oppTitle")} items={data.opportunities} eyebrowColor="var(--brass)" />
      </div>

      {/* Бързи действия */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 4 }}>
        <div className="bi-eyebrow" style={{ color: "var(--navy)", marginBottom: 10 }}>{t("platformbi.chrome.quickTitle")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.key} href={a.href} className="btn btn-ghost btn-sm">{t(`platformbi.chrome.${a.key}`)}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}
