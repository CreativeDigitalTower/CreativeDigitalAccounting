import Link from "next/link";
import { IconInvoice, IconUsers, IconWarehouse, IconExpense, IconChart, IconProjects, IconDoc, IconBuilding, IconBank } from "@/components/Icons";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const highlightIcons = [IconProjects, IconUsers, IconChart];
const moduleIcons = [IconInvoice, IconUsers, IconWarehouse, IconExpense, IconChart, IconProjects, IconDoc, IconBuilding, IconBank];

export default async function SoftwarePage() {
  const { t } = await getT();
  const S = getMessages(await getLocale()).marketing.software as unknown as {
    highlights: { title: string; text: string }[]; modules: { title: string; items: string[] }[];
  };
  const highlights = S.highlights.map((h, i) => ({ ...h, Icon: highlightIcons[i] }));
  const modules = S.modules.map((m, i) => ({ ...m, Icon: moduleIcons[i] }));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 700,
            margin: "0 0 16px",
          }}
        >
          {t("marketing.software.title1")}<br />
          <span style={{ color: "var(--emerald)" }}>{t("marketing.software.titleEm")}</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 32px" }}>
          {t("marketing.software.subtitle")}
        </p>
        <Link href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
          {t("marketing.software.ctaStart")}
        </Link>
      </div>

      {/* Акцент — най-новите големи функционалности */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span style={{ display: "inline-block", background: "var(--emerald-soft)", color: "var(--emerald-dark)", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "4px 14px", borderRadius: 20, marginBottom: 10 }}>{t("marketing.software.newEyebrow")}</span>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 700, margin: 0 }}>{t("marketing.software.newTitle")}</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          {highlights.map((h) => (
            <div key={h.title} className="glass panel hover-lift" style={{ padding: 24, borderTop: "3px solid var(--emerald)", position: "relative" }}>
              <span style={{ position: "absolute", top: 16, right: 16, background: "var(--brass)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: .5, padding: "2px 9px", borderRadius: 20 }}>{t("marketing.software.newBadge")}</span>
              <div className="icon-tile" style={{ marginBottom: 14 }}><h.Icon /></div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 10px", lineHeight: 1.25 }}>{h.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>{h.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        {modules.map((mod) => (
          <div key={mod.title} className="glass panel hover-lift" style={{ padding: "24px" }}>
            <div className="icon-tile" style={{ marginBottom: 12 }}><mod.Icon /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 14px" }}>
              {mod.title}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {mod.items.map((item) => (
                <li key={item} style={{ fontSize: 13, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700, fontSize: 11 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* SAF-T note */}
      <div
        className="glass"
        style={{ marginTop: 40, padding: "20px 24px", borderRadius: 12, borderLeft: "4px solid var(--navy)" }}
      >
        <strong style={{ color: "var(--navy)", fontSize: 13 }}>{t("marketing.software.saftTitle")}</strong>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
          {t("marketing.software.saftText1")}<strong>{t("marketing.software.saftBold")}</strong>{t("marketing.software.saftText2")}
        </p>
      </div>
    </div>
  );
}
