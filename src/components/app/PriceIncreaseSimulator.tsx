"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { useT } from "@/components/i18n/I18nProvider";

export function PriceIncreaseSimulator({ monthlyRetainer, goalTarget }: {
  monthlyRetainer: number; goalTarget: number | null;
}) {
  const t = useT();
  const [pct, setPct] = useState(10);

  const sign = pct >= 0 ? "+" : "";
  const dir = pct >= 0 ? "var(--emerald-dark)" : "var(--brick)";
  const newMonthly = monthlyRetainer * (1 + pct / 100);
  const deltaMonthly = newMonthly - monthlyRetainer;
  const currentAnnual = monthlyRetainer * 12;
  const newAnnual = newMonthly * 12;
  const deltaAnnual = newAnnual - currentAnnual;

  const goalCoverNow = goalTarget && goalTarget > 0 ? (currentAnnual / goalTarget) * 100 : null;
  const goalCoverNew = goalTarget && goalTarget > 0 ? (newAnnual / goalTarget) * 100 : null;

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("simulators.price.title")}</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }} dangerouslySetInnerHTML={{ __html: t("simulators.price.intro") }} />

      {monthlyRetainer <= 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("simulators.price.noData")}</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>{t("simulators.price.changeLabel")}</label>
            <input type="range" min={-50} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ flex: "1 1 200px", minWidth: 160 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" min={-100} max={500} value={pct} onChange={(e) => setPct(Number(e.target.value) || 0)} style={{ width: 74, padding: "5px 8px", textAlign: "right" }} />
              <span style={{ fontWeight: 700 }}>%</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <Stat label={t("simulators.price.curMonthly")} value={formatCurrency(monthlyRetainer)} />
            <Stat label={t("simulators.price.newMonthly", { sign, pct })} value={formatCurrency(newMonthly)} color={dir}
              sub={t("simulators.price.perMonth", { sign, amount: formatCurrency(deltaMonthly) })} subColor={dir} />
            <Stat label={t("simulators.price.curAnnual")} value={formatCurrency(currentAnnual)} />
            <Stat label={t("simulators.price.newAnnual", { sign, pct })} value={formatCurrency(newAnnual)} color={dir}
              sub={t("simulators.price.perYear", { sign, amount: formatCurrency(deltaAnnual) })} subColor={dir} />
          </div>

          {goalTarget && goalCoverNow != null && goalCoverNew != null && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, marginBottom: 8 }}>
                {t("simulators.price.goalContrib", { target: formatCurrency(goalTarget) })}
                <strong style={{ color: "var(--brass)" }}> {Math.round(goalCoverNow)}%</strong>
                <span style={{ margin: "0 6px", color: "var(--muted)" }}>→</span>
                <strong style={{ color: "var(--emerald-dark)" }}>{Math.round(goalCoverNew)}%</strong>
                <span style={{ color: "var(--muted)" }}>{t("simulators.price.goalSuffix")}</span>
              </div>
              <div style={{ position: "relative", height: 10, background: "rgba(217,215,200,.5)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, goalCoverNew)}%`, background: "var(--emerald-soft)" }} />
                <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, goalCoverNow)}%`, background: "var(--emerald)" }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color, subColor }: { label: string; value: string; sub?: string; color?: string; subColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700, color: color ?? "var(--navy)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: subColor ?? "var(--emerald-dark)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
