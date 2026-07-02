"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";

export function PriceIncreaseSimulator({ monthlyRetainer, goalTarget }: {
  monthlyRetainer: number; goalTarget: number | null;
}) {
  const [pct, setPct] = useState(10);

  const newMonthly = monthlyRetainer * (1 + pct / 100);
  const deltaMonthly = newMonthly - monthlyRetainer;
  const currentAnnual = monthlyRetainer * 12;
  const newAnnual = newMonthly * 12;
  const deltaAnnual = newAnnual - currentAnnual;

  const goalCoverNow = goalTarget && goalTarget > 0 ? (currentAnnual / goalTarget) * 100 : null;
  const goalCoverNew = goalTarget && goalTarget > 0 ? (newAnnual / goalTarget) * 100 : null;

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Симулация: увеличение на цените</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
        Ако увеличите месечните абонаменти с даден процент — какви биха били прогнозираните месечни и годишни приходи спрямо текущите и как това помага за финансовата цел.
      </p>

      {monthlyRetainer <= 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Въведете месечни абонаменти на клиентите, за да използвате симулацията.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Увеличение с:</label>
            <input type="range" min={0} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ flex: "1 1 200px", minWidth: 160 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" min={0} max={500} value={pct} onChange={(e) => setPct(Math.max(0, Number(e.target.value) || 0))} style={{ width: 70, padding: "5px 8px", textAlign: "right" }} />
              <span style={{ fontWeight: 700 }}>%</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
            <Stat label="Текущи месечни приходи" value={formatCurrency(monthlyRetainer)} />
            <Stat label={`Нови месечни приходи (+${pct}%)`} value={formatCurrency(newMonthly)} color="var(--emerald-dark)"
              sub={`+${formatCurrency(deltaMonthly)} / месец`} />
            <Stat label="Текущи годишни приходи" value={formatCurrency(currentAnnual)} />
            <Stat label={`Нови годишни приходи (+${pct}%)`} value={formatCurrency(newAnnual)} color="var(--emerald-dark)"
              sub={`+${formatCurrency(deltaAnnual)} / година`} />
          </div>

          {goalTarget && goalCoverNow != null && goalCoverNew != null && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, marginBottom: 8 }}>
                Принос към финансовата цел ({formatCurrency(goalTarget)}):
                <strong style={{ color: "var(--brass)" }}> {Math.round(goalCoverNow)}%</strong>
                <span style={{ margin: "0 6px", color: "var(--muted)" }}>→</span>
                <strong style={{ color: "var(--emerald-dark)" }}>{Math.round(goalCoverNew)}%</strong>
                <span style={{ color: "var(--muted)" }}> (само от абонаменти, годишно)</span>
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

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700, color: color ?? "var(--navy)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--emerald-dark)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
