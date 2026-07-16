import Link from "next/link";
import { IconRocket, IconSeed, IconCalc, IconShield } from "@/components/Icons";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const cardIcons = [<IconRocket key="r" />, <IconSeed key="s" />, <IconCalc key="c" />, <IconShield key="sh" />];

export default async function AboutPage() {
  const { t } = await getT();
  const A = getMessages(await getLocale()).marketing.about as unknown as { cards: { title: string; text: string }[] };
  const cards = A.cards.map((c, i) => ({ ...c, icon: cardIcons[i] }));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 32px 100px" }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 20px" }}>
          {t("marketing.about.title")}
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 620 }}>
          {t("marketing.about.intro")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
        {cards.map((item) => (
          <div key={item.title} className="glass panel" style={{ padding: "24px" }}>
            <div className="icon-tile" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 14 }}>{item.icon}</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 10px" }}>{item.title}</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.6 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 12px" }}>
          {t("marketing.about.ctaTitle")}
        </h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          {t("marketing.about.ctaText")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register" className="btn btn-primary">{t("marketing.about.ctaRegister")}</Link>
          <Link href="/contact" className="btn btn-ghost">{t("marketing.about.ctaContact")}</Link>
        </div>
      </div>
    </div>
  );
}
