import type { Severity } from "@/lib/bi/overview";

const TONE_COLOR: Record<Severity, string> = {
  good: "var(--emerald)", ok: "var(--navy)", attention: "var(--brass)", critical: "var(--brick)",
};

// Полукръгъл gauge за „Здраве на бизнеса" — чист SVG, без библиотеки.
export function HealthGauge({ score, tone, size = 168 }: { score: number; tone: Severity; size?: number }) {
  const color = TONE_COLOR[tone];
  const r = size / 2 - 12;
  const cx = size / 2, cy = size / 2;
  // полукръг от 180° до 360° (горна половина)
  const startA = Math.PI, endA = 2 * Math.PI;
  const a = startA + (endA - startA) * Math.max(0, Math.min(100, score)) / 100;
  const pt = (ang: number) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)] as const;
  const [sx, sy] = pt(startA);
  const [ex, ey] = pt(endA);
  const [px, py] = pt(a);
  const large = a - startA > Math.PI ? 1 : 0;
  const track = `M${sx},${sy} A${r},${r} 0 0 1 ${ex},${ey}`;
  const prog = `M${sx},${sy} A${r},${r} 0 ${large} 1 ${px},${py}`;

  return (
    <svg width={size} height={size / 2 + 26} viewBox={`0 0 ${size} ${size / 2 + 26}`}>
      <defs>
        <linearGradient id="hg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={track} fill="none" stroke="rgba(20,30,25,.08)" strokeWidth="11" strokeLinecap="round" />
      <path d={prog} fill="none" stroke="url(#hg)" strokeWidth="11" strokeLinecap="round" className="bi-sweep" />
      <circle cx={px} cy={py} r="6" fill="#fff" stroke={color} strokeWidth="3" />
      <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 30, fill: "var(--ink)" }}>{score}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: "var(--muted)", letterSpacing: ".5px" }}>/ 100</text>
    </svg>
  );
}
