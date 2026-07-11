"use client";

import type { MetricCard } from "@/lib/bi/overview";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

export function BiKpiCard({ card, index = 0 }: { card: MetricCard; index?: number }) {
  const better = card.direction === "flat" || card.deltaPct == null
    ? "flat"
    : (card.goodWhenUp ? card.direction === "up" : card.direction === "down") ? "up" : "down";
  const accent = better === "up" ? "var(--emerald)" : better === "down" ? "var(--brick)" : "var(--navy)";
  const sparkColor = card.goodWhenUp ? "var(--emerald)" : "var(--brass)";
  const arrow = card.direction === "up" ? "▲" : card.direction === "down" ? "▼" : "■";
  const deltaText = card.deltaPct == null ? "—" : `${Math.abs(card.deltaPct).toFixed(1)}%`;

  return (
    <div className={`bi-card bi-in bi-in-${(index % 6) + 1}`} style={{ ["--accent" as string]: accent }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span className="bi-label">{card.label}</span>
        {card.deltaPct != null && <span className={`bi-trend ${better}`}>{arrow} {deltaText}</span>}
      </div>
      <div className="bi-value">
        <CountUp value={card.value} money={card.money} />
      </div>
      <div className="bi-caption" style={{ marginTop: 4, marginBottom: 10 }}>{card.caption}</div>
      <Sparkline data={card.spark} color={sparkColor} id={card.key} width={300} height={30} />
    </div>
  );
}
