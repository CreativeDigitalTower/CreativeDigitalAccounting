import type { BusinessOverview } from "@/lib/bi/overview";
import { BiKpiCard } from "./BiKpiCard";
import { TrendArea } from "./TrendArea";
import { HealthGauge } from "./HealthGauge";
import { InsightFeed } from "./InsightFeed";

const TONE_TEXT: Record<string, string> = {
  good: "var(--emerald-dark)", ok: "var(--navy)", attention: "var(--brass)", critical: "var(--brick)",
};
const money = (v: number) => Math.round(v).toLocaleString("bg-BG") + " €";

export function BusinessOverviewSection({ data }: { data: BusinessOverview }) {
  if (!data.hasData) {
    return (
      <div className="bi-card bi-flat bi-in" style={{ textAlign: "center", padding: "34px 20px", marginBottom: 26 }}>
        <div className="bi-eyebrow" style={{ marginBottom: 8 }}>Обзор на бизнеса</div>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>Още няма достатъчно данни за анализ. Издайте първите фактури и добавете разходи, за да видите интелигентните изводи.</div>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div>
          <div className="bi-eyebrow">Обзор на бизнеса</div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>Какво се случва в бизнеса Ви</h2>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Последни 6 месеца · сравнение спрямо предходния месец</div>
      </div>

      {/* KPI карти */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 16 }}>
        {data.cards.map((c, i) => <BiKpiCard key={c.key} card={c} index={i} />)}
      </div>

      {/* Тренд график + Здраве */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(240px, 1fr)", gap: 14, marginBottom: 16 }} className="bi-overview-main">
        <div className="bi-card bi-flat bi-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)" }}>Приходи · Разходи · Печалба</div>
          </div>
          <TrendArea
            labels={data.monthsLabels}
            series={[
              { name: "Приходи", color: "var(--emerald)", data: data.revenueSeries, kind: "area" },
              { name: "Разходи", color: "var(--brass)", data: data.expenseSeries, kind: "line" },
              { name: "Печалба", color: "var(--navy)", data: data.profitSeries, kind: "line" },
            ]}
          />
        </div>
        <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="bi-eyebrow" style={{ color: TONE_TEXT[data.health.tone], alignSelf: "flex-start" }}>Здраве на бизнеса</div>
          <HealthGauge score={data.health.score} tone={data.health.tone} />
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 4 }}>{data.health.label}</div>
        </div>
      </div>

      {/* Forecast strip */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span className="bi-eyebrow" style={{ color: "var(--navy)" }}>Прогноза за месеца</span>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>при текущия темп · изминали {data.forecast.progressPct}% от месеца</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { l: "Очакван оборот", v: money(data.forecast.revenue), c: "var(--emerald-dark)" },
            { l: "Очаквани разходи", v: money(data.forecast.expenses), c: "var(--brick)" },
            { l: "Очаквана печалба", v: money(data.forecast.profit), c: data.forecast.profit >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
            { l: "Очакван ДДС", v: money(data.forecast.vat), c: "var(--brass)" },
            { l: "Очаквани документи", v: String(data.forecast.documents), c: "var(--navy)" },
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
        <InsightFeed title="Интелигентни изводи" items={data.insights} eyebrowColor="var(--emerald-dark)" />
        <InsightFeed title="Внимание · рискове" items={data.risks} eyebrowColor="var(--brick)" />
        <InsightFeed title="Възможности за растеж" items={data.opportunities} eyebrowColor="var(--brass)" />
      </div>
    </section>
  );
}
