"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { id: "this_month", label: "Текущ месец" },
  { id: "last_month", label: "Предишен месец" },
  { id: "quarter", label: "Тримесечие" },
  { id: "year", label: "Тази година" },
  { id: "last_year", label: "Миналата година" },
];

export function AnalyticsPeriod({ active }: { active: string }) {
  const router = useRouter();
  const [showRange, setShowRange] = useState(active === "custom");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function pick(id: string) {
    setShowRange(false);
    router.push(id === "this_month" ? "/dashboard/analytics" : `/dashboard/analytics?period=${id}`);
  }
  function applyRange() { if (from && to) router.push(`/dashboard/analytics?from=${from}&to=${to}`); }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {PRESETS.map((p) => (
        <button key={p.id} onClick={() => pick(p.id)} className={`filter-tab${active === p.id ? " active" : ""}`} style={{ fontSize: 12.5 }}>{p.label}</button>
      ))}
      <button onClick={() => setShowRange((v) => !v)} className={`filter-tab${active === "custom" ? " active" : ""}`} style={{ fontSize: 12.5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M3.5 9h17M8 2.5v4M16 2.5v4" /></svg> Период</span>
      </button>
      {showRange && (
        <div className="glass" style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "auto", fontSize: 12.5, padding: "5px 8px" }} />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "auto", fontSize: 12.5, padding: "5px 8px" }} />
          <button onClick={applyRange} className="btn btn-primary btn-sm" disabled={!from || !to}>Покажи</button>
        </div>
      )}
    </div>
  );
}
