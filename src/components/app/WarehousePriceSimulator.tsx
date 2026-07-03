"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/constants";

/**
 * Симулация на промяна (увеличение/намаление) на цените на артикулите в склада.
 * Прогнозира новата обща стойност на наличностите и печалбата при избран процент.
 */
export function WarehousePriceSimulator({ totalValue, itemCount, avgUnit }: {
  totalValue: number; itemCount: number; avgUnit: number;
}) {
  const [pct, setPct] = useState(10);
  const sign = pct >= 0 ? "+" : "";
  const dir = pct >= 0 ? "var(--emerald-dark)" : "var(--brick)";

  const factor = 1 + pct / 100;
  const newTotal = totalValue * factor;
  const delta = newTotal - totalValue;
  const newAvg = avgUnit * factor;

  return (
    <div className="glass panel" style={{ marginTop: 16 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Симулация: промяна на цените в склада</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
        Ако <strong>увеличите или намалите</strong> цените на продуктите с даден процент — каква би била прогнозната обща стойност на наличностите и средната единична цена.
      </p>

      {totalValue <= 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Въведете единични цени на артикулите, за да използвате симулацията.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Промяна:</label>
            <input type="range" min={-50} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ flex: "1 1 200px", minWidth: 160 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" min={-100} max={500} value={pct} onChange={(e) => setPct(Number(e.target.value) || 0)} style={{ width: 74, padding: "5px 8px", textAlign: "right" }} />
              <span style={{ fontWeight: 700 }}>%</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14 }}>
            <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Текуща обща стойност</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(totalValue)}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{itemCount} артикула</div></div>
            <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Нова обща стойност ({sign}{pct}%)</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: dir }}>{formatCurrency(newTotal)}</div><div style={{ fontSize: 11.5, color: dir }}>{sign}{formatCurrency(delta)}</div></div>
            <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Средна единична цена</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(avgUnit)}</div></div>
            <div><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Нова средна цена ({sign}{pct}%)</div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: dir }}>{formatCurrency(newAvg)}</div></div>
          </div>
        </>
      )}
    </div>
  );
}
