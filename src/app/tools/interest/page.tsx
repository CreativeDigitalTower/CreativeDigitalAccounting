"use client";

import { useState } from "react";
import Link from "next/link";

export default function InterestCalc() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("3");
  const [type, setType] = useState<"simple" | "compound">("compound");

  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100;
  const t = parseFloat(years) || 0;

  const final = type === "simple" ? p * (1 + r * t) : p * Math.pow(1 + r, t);
  const interest = final - p;

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Всички инструменти</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>Лихвен калкулатор</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button className={`filter-tab${type === "simple" ? " active" : ""}`} onClick={() => setType("simple")}>Проста лихва</button>
          <button className={`filter-tab${type === "compound" ? " active" : ""}`} onClick={() => setType("compound")}>Сложна лихва</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <div><label>Главница</label><input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div><label>Год. лихва (%)</label><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div><label>Период (години)</label><input type="number" value={years} onChange={(e) => setYears(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ textAlign: "center", padding: 18, background: "var(--brass-soft)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Натрупана лихва</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--brass)" }}>{interest.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "center", padding: 18, background: "var(--emerald-soft)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Крайна сума</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald-dark)" }}>{final.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
