import Link from "next/link";
import type { Metadata } from "next";
import { FirmSubscriptionPlans } from "@/components/app/FirmSubscriptionPlans";
import { IconBuilding, IconChart, IconUsers, IconFileStack, IconRocket, IconShield } from "@/components/Icons";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import type { ComponentType } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("marketing.accountants.metaTitle"),
    description: t("marketing.accountants.metaDesc"),
  };
}

const firmIcons: ComponentType[] = [IconBuilding, IconChart, IconFileStack, IconShield];
const clientIcons: ComponentType[] = [IconRocket, IconChart, IconUsers];

export default async function AccountantsPage() {
  const { t } = await getT();
  const A = getMessages(await getLocale()).marketing.accountants as unknown as {
    steps: { title: string; desc: string }[];
    firmBenefits: { title: string; desc: string }[];
    clientBenefits: { title: string; desc: string }[];
    faq: { q: string; a: string }[];
  };
  const steps = A.steps.map((s, i) => ({ ...s, n: String(i + 1) }));
  const firmBenefits = A.firmBenefits.map((b, i) => ({ ...b, Icon: firmIcons[i] }));
  const clientBenefits = A.clientBenefits.map((b, i) => ({ ...b, Icon: clientIcons[i] }));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px 90px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <span style={{ display: "inline-block", background: "var(--navy-soft)", color: "var(--navy)", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>{t("marketing.accountants.badge")}</span>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 16px", lineHeight: 1.1 }}>
          {t("marketing.accountants.heroTitle1")}<br /><span style={{ color: "var(--emerald)" }}>{t("marketing.accountants.heroTitleEm")}</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.6 }}>
          {t("marketing.accountants.heroSubtitle")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.accountants.ctaStart")}</Link>
          <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.accountants.ctaContact")}</Link>
        </div>
      </div>

      {/* Как работи */}
      <section style={{ marginBottom: 60 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>{t("marketing.accountants.howTitle")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {steps.map((s) => (
            <div key={s.n} className="glass panel hover-lift" style={{ padding: "22px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -14, right: -4, fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 84, color: "rgba(15,138,106,.07)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, var(--emerald), var(--emerald-dark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 17, marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontFamily: "'Fraunces', serif", fontWeight: 700, position: "relative" }}>{s.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.5, position: "relative" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Безплатен СТАРТ акцент */}
      <section className="glass panel" style={{ padding: "32px 28px", marginBottom: 60, textAlign: "center", borderLeft: "4px solid var(--emerald)" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>{t("marketing.accountants.freeStartTitle")}</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.65, maxWidth: 760, margin: "0 auto" }}>
          {t("marketing.accountants.freeStartText")}
        </p>
      </section>

      {/* Предимства */}
      <section style={{ marginBottom: 60 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }} className="acc-benefits">
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>{t("marketing.accountants.firmTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {firmBenefits.map((b) => (
                <div key={b.title} className="glass panel" style={{ padding: "16px 18px", display: "flex", gap: 12 }}>
                  <div className="icon-tile" style={{ width: 40, height: 40, flexShrink: 0 }}><b.Icon /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{b.title}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>{t("marketing.accountants.clientTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clientBenefits.map((b) => (
                <div key={b.title} className="glass panel" style={{ padding: "16px 18px", display: "flex", gap: 12 }}>
                  <div className="icon-tile" style={{ width: 40, height: 40, flexShrink: 0 }}><b.Icon /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{b.title}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Планове */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, margin: "0 0 8px" }}>{t("marketing.accountants.plansTitle")}</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("marketing.accountants.plansSubtitle")}</p>
        </div>
        <FirmSubscriptionPlans currentPlan={null} />
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>{t("marketing.accountants.ctaStart")}</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>{t("marketing.accountants.faqTitle")}</h2>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {A.faq.map((f) => (
            <div key={f.q} className="glass panel" style={{ padding: "18px 22px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Fraunces', serif", marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="glass panel" style={{ padding: "36px 28px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>{t("marketing.accountants.finalTitle")}</h2>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 auto 22px", maxWidth: 620, lineHeight: 1.6 }}>
          {t("marketing.accountants.finalText")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.accountants.finalStart")}</Link>
          <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.accountants.finalContact")}</Link>
        </div>
      </section>
    </div>
  );
}
