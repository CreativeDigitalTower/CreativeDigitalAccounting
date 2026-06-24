"use client";

import { useState } from "react";
import Link from "next/link";

export default function MarkupCalc() {
  const [cost, setCost] = useState("100");
  const [markup, setMarkup] = useState("30");

  const c = parseFloat(cost) || 0;
  const m = parseFloat(markup) || 0;
  const price = c * (1 + m / 100);
  const profit = price - c;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  return (
    <>
      <Link href="/tools" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Всички инструменти</Link>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>Калкулатор за надценка и печалба</h1>

      <div className="glass panel" style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label>Себестойност</label><input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <div><label>Надценка (%)</label><input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { l: "Продажна цена", v: price.toFixed(2), c: "var(--emerald-dark)", bg: "var(--emerald-soft)" },
            { l: "Печалба", v: profit.toFixed(2), c: "var(--brass)", bg: "var(--brass-soft)" },
            { l: "Марж", v: margin.toFixed(1) + "%", c: "var(--navy)", bg: "var(--navy-soft)" },
          ].map((x) => (
            <div key={x.l} style={{ textAlign: "center", padding: 18, background: x.bg, borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{x.l}</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
