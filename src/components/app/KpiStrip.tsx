import { formatCurrency } from "@/lib/constants";

export type Kpi = { label: string; value: string; hint?: string; color?: string };

export function KpiStrip({ title, kpis }: { title: string; kpis: Kpi[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, margin: "0 0 10px", color: "var(--ink-soft)" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass kpi-card kpi-anim" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{k.label}</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 700, color: k.color ?? "var(--ink)", marginTop: 2 }}>{k.value}</div>
            {k.hint && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{k.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export { formatCurrency };
