"use client";

import Link from "next/link";
import type { Insight } from "@/lib/bi/overview";
import { useI18n } from "@/components/i18n/I18nProvider";
import { BiIcon } from "./BiIcon";

export function InsightFeed({ title, items, eyebrowColor = "var(--brass)" }: { title: string; items: Insight[]; eyebrowColor?: string }) {
  const { t, money } = useI18n();

  function render(it: Insight): { text: string; cta?: string } {
    if (it.key) {
      const vars: Record<string, string | number> = { ...(it.vars ?? {}) };
      if (it.refKey) vars.ref = t(it.refKey);
      if (it.amount != null) vars.amount = money(it.amount);
      return { text: t(it.key, vars), cta: it.ctaKey ? t(it.ctaKey) : it.cta };
    }
    return { text: it.text ?? "", cta: it.cta };
  }

  return (
    <div className="bi-card bi-flat bi-in" style={{ display: "flex", flexDirection: "column" }}>
      <div className="bi-eyebrow" style={{ color: eyebrowColor, marginBottom: 6 }}>{title}</div>
      <div>
        {items.map((it, i) => {
          const r = render(it);
          return (
            <div key={i} className="bi-insight">
              <span className={`bi-dot ${it.severity}`} style={{ marginTop: 5 }} />
              <span className="ico"><BiIcon name={it.icon} size={15} /></span>
              <span style={{ fontSize: 12.7, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                {r.text}
                {it.href && r.cta && (
                  <>
                    {" "}
                    <Link href={it.href} style={{ color: "var(--emerald-dark)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>{r.cta} →</Link>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
