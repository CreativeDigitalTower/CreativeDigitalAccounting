"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/constants";

/** Интерактивна графика с барове по месеци — hover показва стойност и анимира. */
export function MonthlyBarChart({ months, values, currentIndex, title }: {
  months: string[]; values: number[]; currentIndex: number; title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const max = Math.max(...values, 1);

  return (
    <div className="glass panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{title}</h3>
        {hover !== null && (
          <span className="num pop-in" style={{ fontSize: 13, fontWeight: 700, color: "var(--emerald-dark)" }}>
            {months[hover]}: {formatCurrency(values[hover])}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, position: "relative" }}>
        {months.map((month, i) => {
          const val = values[i] ?? 0;
          const h = max > 0 ? Math.max(4, (val / max) * 112) : 4;
          const isCur = i === currentIndex;
          const active = hover === i;
          return (
            <div key={month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <div className="chart-bar" title={formatCurrency(val)}
                style={{
                  width: "100%",
                  height: mounted ? h : 4,
                  background: active ? "var(--emerald-dark)" : isCur ? "var(--emerald)" : "rgba(31,111,84,.3)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height .5s cubic-bezier(.22,1,.36,1), background .2s, transform .2s, box-shadow .2s",
                  transform: active ? "scaleY(1.05)" : "scaleY(1)",
                  transformOrigin: "bottom",
                  boxShadow: active ? "0 0 14px rgba(15,138,106,.55)" : "none",
                  opacity: hover !== null && !active ? 0.55 : 1,
                }}
              />
              <span style={{ fontSize: 9.5, color: active ? "var(--emerald-dark)" : "var(--muted)", fontWeight: active ? 700 : 400 }}>{month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
