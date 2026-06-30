"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/constants";
import type { ClientRevenue } from "@/lib/clientRevenue";

const COLORS = ["#0F8A6A", "#2C4A66", "#A5812E", "#3F9C82", "#A23B2B"];

/** Топ 5 клиента по приход (на база издадени фактури) с процентно разпределение. */
export function TopClientsChart({ data, title = "Топ 5 клиента по приход" }: { data: ClientRevenue[]; title?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const top = [...data].sort((a, b) => b.total - a.total).slice(0, 5);
  const grand = data.reduce((s, d) => s + d.total, 0);
  const max = top[0]?.total || 1;

  if (top.length === 0 || grand === 0) {
    return (
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{title}</h3>
        <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0" }}>Все още няма данни за приходи от фактури.</div>
      </div>
    );
  }

  // Donut chart (conic-gradient)
  let acc = 0;
  const segments = top.map((c, i) => {
    const start = (acc / grand) * 100;
    acc += c.total;
    const end = (acc / grand) * 100;
    return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
  });
  const othersPct = grand > acc ? ((grand - acc) / grand) * 100 : 0;
  const gradient = `conic-gradient(${segments.join(", ")}${othersPct > 0 ? `, #D9D7C8 ${(acc / grand) * 100}% 100%` : ""})`;

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{title}</h3>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: gradient, transition: "transform .35s cubic-bezier(.22,1,.36,1), box-shadow .3s", transform: hover !== null ? "scale(1.07) rotate(3deg)" : "scale(1)", boxShadow: hover !== null ? `0 8px 26px ${COLORS[hover % COLORS.length]}55` : "none" }} />
          <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "var(--paper, #fff)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 6 }}>
            {hover !== null ? (
              <>
                <div style={{ fontSize: 9.5, color: "var(--muted)", maxWidth: 78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top[hover].name}</div>
                <div className="num" style={{ fontSize: 14, fontWeight: 700, color: COLORS[hover % COLORS.length] }}>{((top[hover].total / grand) * 100).toFixed(1)}%</div>
                <div className="num" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{formatCurrency(top[hover].total)}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Общо</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(grand)}</div>
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 9 }}>
          {top.map((c, i) => {
            const pct = (c.total / grand) * 100;
            const dim = hover !== null && hover !== i;
            return (
              <div key={c.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ opacity: dim ? 0.45 : 1, transition: "opacity .15s, transform .2s", cursor: "pointer", transform: hover === i ? "translateX(3px)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[i % COLORS.length], transition: "transform .2s", transform: hover === i ? "scale(1.4)" : "scale(1)" }} />
                    {c.name}
                  </span>
                  <span className="num" style={{ color: "var(--ink-soft)" }}>{formatCurrency(c.total)} · {pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: hover === i ? 9 : 6, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden", transition: "height .2s" }}>
                  <div style={{ width: mounted ? `${(c.total / max) * 100}%` : "0%", height: "100%", background: COLORS[i % COLORS.length], borderRadius: 4, transition: "width .6s cubic-bezier(.22,1,.36,1), box-shadow .2s", boxShadow: hover === i ? `0 0 12px ${COLORS[i % COLORS.length]}` : "none" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

