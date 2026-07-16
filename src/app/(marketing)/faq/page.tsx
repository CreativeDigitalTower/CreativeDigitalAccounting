import type { Metadata } from "next";
import Link from "next/link";
import { IconRocket, IconInvoice, IconCash, IconShield } from "@/components/Icons";
import type { ComponentType } from "react";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("marketing.faq.metaTitle"),
    description: t("marketing.faq.metaDesc"),
  };
}

type QA = { q: string; a: string[]; highlight?: boolean };
const groupIcons: ComponentType[] = [IconRocket, IconInvoice, IconCash, IconShield];

export default async function FaqPage() {
  const { t } = await getT();
  const F = getMessages(await getLocale()).marketing.faq as unknown as { groups: { title: string; items: QA[] }[] };
  const groups = F.groups.map((g, gi) => ({
    title: g.title,
    Icon: groupIcons[gi],
    items: g.items.map((qa, ii) => ({ ...qa, highlight: gi === 0 && ii === 0 })),
  }));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.faq.eyebrow")}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-.5px" }}>{t("marketing.faq.title")}</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15.5, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          {t("marketing.faq.intro")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {groups.map((g) => (
          <section key={g.title}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 11 }}>
              <span className="icon-tile" style={{ width: 34, height: 34 }}><g.Icon /></span> {g.title}
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {g.items.map((qa, i) => (
                <details key={i} className="glass panel faq-card" open={qa.highlight}
                  style={{ padding: "16px 20px", borderRadius: 14, borderLeft: qa.highlight ? "4px solid var(--emerald)" : undefined }}>
                  <summary style={{ cursor: "pointer", fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16.5, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span>{qa.q}</span>
                    <span style={{ color: "var(--emerald)", fontSize: 22, lineHeight: 1, flexShrink: 0 }}>+</span>
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    {qa.a.map((p, j) => <p key={j} style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}>{p}</p>)}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="glass panel" style={{ marginTop: 44, padding: "30px 28px", textAlign: "center", borderRadius: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, margin: "0 0 8px" }}>{t("marketing.faq.notFoundTitle")}</h3>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 0 18px" }}>{t("marketing.faq.notFoundText")}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/contact" className="btn btn-primary">{t("marketing.faq.contactBtn")}</Link>
          <Link href="/register" className="btn btn-ghost">{t("marketing.faq.registerBtn")}</Link>
        </div>
      </div>
    </div>
  );
}
