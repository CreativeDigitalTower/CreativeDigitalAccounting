"use client";

import { useRef, useState } from "react";

type Series = { name: string; color: string; data: number[]; kind: "area" | "line" };

export function TrendArea({ labels, series, height = 240 }: { labels: string[]; series: Series[]; height?: number }) {
  const W = 760, H = height, padL = 8, padR = 8, padT = 16, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const n = labels.length;
  const x = (i: number) => padL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => padT + innerH - ((v - min) / range) * innerH;

  function linePath(d: number[]) { return d.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "); }
  function areaPath(d: number[]) { return `${linePath(d)} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`; }

  // хоризонтални助 линии
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + innerH - t * innerH);

  function onMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect(); if (!rect) return;
    const rx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rx - padL) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }
  const fmt = (v: number) => v.toLocaleString("bg-BG", { maximumFractionDigits: 0 });

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          {series.filter((s) => s.kind === "area").map((s, i) => (
            <linearGradient key={i} id={`ta-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {grid.map((gy, i) => <line key={i} x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="var(--bi-grid)" strokeWidth="1" />)}
        {series.map((s, i) => s.kind === "area" ? (
          <g key={s.name}>
            <path d={areaPath(s.data)} fill={`url(#ta-${i})`} className="bi-sweep" />
            <path d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="bi-sweep" />
          </g>
        ) : (
          <path key={s.name} d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.name === "Печалба" ? "5 4" : undefined} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="bi-sweep" />
        ))}
        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="rgba(20,30,25,.18)" strokeWidth="1" />
            {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.data[hover])} r="3.6" fill="#fff" stroke={s.color} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />)}
          </>
        )}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" style={{ fontSize: 11, fill: "var(--muted)" }}>{l}</text>
        ))}
      </svg>

      {/* Легенда */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-soft)" }}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: s.color, display: "inline-block" }} />{s.name}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hover != null && (
        <div style={{
          position: "absolute", top: 6, left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "8px"})`,
          background: "#16201C", color: "#fff", borderRadius: 10, padding: "8px 11px", fontSize: 11.5, pointerEvents: "none",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,.5)", minWidth: 130, zIndex: 3,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, letterSpacing: ".3px" }}>{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, opacity: .85 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />{s.name}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{fmt(s.data[hover])} €</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
