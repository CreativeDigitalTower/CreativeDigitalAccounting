import Link from "next/link";
import { Pricing } from "@/components/marketing/Pricing";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import {
  IconInvoice, IconWarehouse, IconExpense, IconChart, IconUsers, IconFactory,
  IconDoc, IconProjects, IconShield, IconCalendar, IconFileStack, IconBuilding,
  IconBank,
} from "@/components/Icons";

// Иконите остават в кода; текстовете идват от преводите (namespace „marketing").
const featureIcons = [
  IconInvoice, IconWarehouse, IconExpense, IconChart, IconUsers, IconFactory,
  IconDoc, IconProjects, IconBuilding, IconShield, IconCalendar, IconFileStack,
];
const newFeatureIcons = [IconProjects, IconUsers, IconChart];
const highlightIcons = [IconFileStack, IconChart, IconShield, IconBank];

type Copy = { title: string; desc: string };
type Stat = { num: string; label: string };
type StatBar = { num: string; unit: string; label: string };

export default async function HomePage() {
  const { t } = await getT();
  const H = getMessages(await getLocale()).marketing.home as unknown as {
    features: Copy[]; newFeatures: Copy[]; highlights: Copy[]; steps: Copy[]; stats: Stat[]; statsBar: StatBar[];
  };
  const features = H.features.map((f, i) => ({ ...f, Icon: featureIcons[i] }));
  const newFeatures = H.newFeatures.map((f, i) => ({ ...f, Icon: newFeatureIcons[i] }));
  const highlights = H.highlights.map((h, i) => ({ ...h, Icon: highlightIcons[i] }));
  const steps = H.steps.map((s, i) => ({ ...s, n: String(i + 1) }));

  return (
    <>
      {/* Hero — асиметричен, оригинален layout */}
      <section className="home-hero" style={{ maxWidth: 1200, margin: "0 auto", padding: "68px 32px 56px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 48, alignItems: "center" }}>
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4, borderRadius: 4, background: "linear-gradient(var(--emerald), var(--brass))" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brass-soft)", border: "1px solid rgba(166,130,47,.3)", borderRadius: 20, padding: "5px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--brass)", marginBottom: 22 }}>
            {t("marketing.home.heroBadge")}
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(36px, 5vw, 62px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-1px", color: "var(--ink)", margin: "0 0 20px" }}>
            {t("marketing.home.heroTitle1")}<br /><span style={{ color: "var(--emerald)" }}>{t("marketing.home.heroTitle2")}</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.4vw, 18px)", color: "var(--ink-soft)", maxWidth: 520, margin: "0 0 30px", lineHeight: 1.6 }}>
            {t("marketing.home.heroSubtitle")}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "13px 28px" }}>{t("marketing.home.heroCtaStart")}</Link>
            <Link href="/software" className="btn btn-ghost" style={{ fontSize: 15, padding: "13px 28px" }}>{t("marketing.home.heroCtaFeatures")}</Link>
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: "var(--muted)" }}>
            <span>{t("marketing.home.perk1")}</span>
            <span>{t("marketing.home.perk2")}</span>
            <span>{t("marketing.home.perk3")}</span>
          </div>
        </div>

        {/* Дясно: композиция от „плаващи“ карти — собствена илюстрация */}
        <div className="home-hero-art" style={{ position: "relative", minHeight: 380 }}>
          <div className="glass panel" style={{ position: "absolute", top: 0, right: 0, width: "88%", padding: "18px 20px", borderRadius: 16, boxShadow: "0 20px 50px rgba(20,30,25,.14)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14 }}>{t("marketing.home.artDashboard")}</span>
              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{t("marketing.home.artThisMonth")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[[t("marketing.home.artRevenue"), "12 480 €", "var(--emerald-dark)"], [t("marketing.home.artExpenses"), "4 210 €", "var(--brick)"], [t("marketing.home.artProfit"), "8 270 €", "var(--navy)"], [t("marketing.home.artInvoices"), "37", "var(--brass)"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "rgba(255,255,255,.5)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{l}</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 700, color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "flex-end", gap: 5, height: 54 }}>
              {[40, 62, 48, 75, 58, 88, 70, 96].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 7 ? "var(--emerald)" : "rgba(15,138,106,.28)", borderRadius: "3px 3px 0 0" }} />
              ))}
            </div>
          </div>
          <div className="glass" style={{ position: "absolute", bottom: 8, left: 0, width: "62%", padding: "14px 16px", borderRadius: 14, boxShadow: "0 16px 40px rgba(20,30,25,.16)" }}>
            <div style={{ fontSize: 10.5, color: "var(--brass)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{t("marketing.home.artInvoiceLabel")}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>{t("marketing.home.artConsulting")}</span><span className="num">500,00 €</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}><span style={{ color: "var(--muted)" }}>{t("marketing.home.artHosting")}</span><span className="num">90,00 €</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 6 }}><span>{t("marketing.home.artTotal")}</span><span className="num" style={{ color: "var(--emerald-dark)" }}>590,00 €</span></div>
            <div style={{ marginTop: 8, display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--emerald)", borderRadius: 12, padding: "2px 10px" }}>{t("marketing.home.artPaid")}</div>
          </div>
        </div>
      </section>

      {/* Най-новите големи функционалности */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.home.newEyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          {t("marketing.home.newTitle")}
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 680, marginInline: "auto" }}>
          {t("marketing.home.newSubtitle")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          {newFeatures.map((f) => (
            <div key={f.title} className="glass panel hover-lift" style={{ padding: "24px", borderTop: "3px solid var(--emerald)", position: "relative" }}>
              <span style={{ position: "absolute", top: 16, right: 16, background: "var(--brass)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: .5, padding: "2px 9px", borderRadius: 20 }}>{t("marketing.home.newBadge")}</span>
              <div className="icon-tile" style={{ marginBottom: 14 }}><f.Icon /></div>
              <h3 style={{ margin: "0 0 10px", fontSize: 17, fontFamily: "'Fraunces', serif", fontWeight: 700, lineHeight: 1.25 }}>{f.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.home.featuresEyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          {t("marketing.home.featuresTitle")}
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 640, marginInline: "auto" }}>
          {t("marketing.home.featuresSubtitle")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {features.map((f) => (
            <div key={f.title} className="glass panel hover-lift" style={{ padding: "22px 24px" }}>
              <div className="icon-tile" style={{ marginBottom: 12 }}><f.Icon /></div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontFamily: "'Fraunces', serif", fontWeight: 700 }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.55 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Защо да изберете */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.home.whyEyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          {t("marketing.home.whyTitle")}
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 720, marginInline: "auto", lineHeight: 1.6 }}>
          {t("marketing.home.whySubtitle")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {highlights.map((h) => (
            <div key={h.title} className="glass panel hover-lift" style={{ padding: "22px 24px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <div className="icon-tile" style={{ width: 50, height: 50 }}><h.Icon /></div>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Fraunces', serif", fontWeight: 700 }}>{h.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.55 }}>{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Подходящ за всяка компания */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div className="glass panel" style={{ padding: "28px 32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>{t("marketing.home.anyTitle")}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, maxWidth: 760, margin: "0 auto" }}>
            {t("marketing.home.anyText")}
          </p>
        </div>
      </section>

      {/* Какво получавате */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.home.resultsEyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>{t("marketing.home.resultsTitle")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          {H.stats.map((s) => (
            <div key={s.label} className="glass panel hover-lift" style={{ padding: "24px 14px", textAlign: "center" }}>
              <div className="num" style={{ fontSize: 34, fontWeight: 700, background: "linear-gradient(120deg, var(--emerald), var(--brass))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.num}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 18, fontSize: 13.5, maxWidth: 720, marginInline: "auto" }}>
          {t("marketing.home.resultsNote")}
        </p>
      </section>

      {/* Как работи */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>{t("marketing.home.howEyebrow")}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>{t("marketing.home.howTitle")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, position: "relative" }}>
          {steps.map((s) => (
            <div key={s.n} className="glass panel hover-lift" style={{ padding: "26px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -14, right: -6, fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 90, color: "rgba(15,138,106,.07)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--emerald), var(--emerald-dark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 19, marginBottom: 14, boxShadow: "0 6px 16px rgba(15,138,106,.3)" }}>{s.n}</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontFamily: "'Fraunces', serif", fontWeight: 700, position: "relative" }}>{s.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.55, position: "relative" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="glass" style={{ margin: "0 32px 80px", borderRadius: 14 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24, textAlign: "center" }}>
          {H.statsBar.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 700, color: "var(--emerald)" }}>
                {s.num} <span style={{ fontSize: 14, color: "var(--muted)" }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <Pricing />

      {/* Дигитални услуги + фирми, които ни се довериха */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 32px 80px" }}>
        <div className="glass panel" style={{ padding: "40px 32px", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "var(--emerald-soft)", color: "var(--emerald-dark)", borderRadius: 20, padding: "5px 16px", fontSize: 12.5, fontWeight: 700, letterSpacing: 1, marginBottom: 18 }}>
            {t("marketing.home.ctaEyebrow")}
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, margin: "0 0 16px" }}>
            {t("marketing.home.ctaTitle")}
          </h2>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 720, margin: "0 auto 22px" }}>
            {t("marketing.home.ctaText1")}<strong>{t("marketing.home.ctaTextStrong")}</strong>{t("marketing.home.ctaText2")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/services" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.home.ctaServices")}</Link>
            <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>{t("marketing.home.ctaContact")}</Link>
          </div>
        </div>
      </section>

      {/* JSON-LD структурирани данни за SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Creative Digital Accounting",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: t("marketing.home.jsonldDesc"),
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "EUR",
              lowPrice: "0",
              highPrice: "59",
              offerCount: "4",
            },
            publisher: {
              "@type": "Organization",
              name: "Криейтив Диджитъл Тауър ЕООД",
              url: "https://creativedigitaltower.com",
            },
          }),
        }}
      />
    </>
  );
}
