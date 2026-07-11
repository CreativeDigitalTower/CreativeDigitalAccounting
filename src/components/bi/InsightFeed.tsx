import type { Insight } from "@/lib/bi/overview";
import { BiIcon } from "./BiIcon";

export function InsightFeed({ title, items, eyebrowColor = "var(--brass)" }: { title: string; items: Insight[]; eyebrowColor?: string }) {
  return (
    <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column" }}>
      <div className="bi-eyebrow" style={{ color: eyebrowColor, marginBottom: 6 }}>{title}</div>
      <div>
        {items.map((it, i) => (
          <div key={i} className="bi-insight">
            <span className={`bi-dot ${it.severity}`} style={{ marginTop: 5 }} />
            <span className="ico"><BiIcon name={it.icon} size={15} /></span>
            <span style={{ fontSize: 12.7, color: "var(--ink-soft)", lineHeight: 1.5 }}>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
