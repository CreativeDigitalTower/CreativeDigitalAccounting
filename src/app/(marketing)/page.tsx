import Link from "next/link";
import { Pricing } from "@/components/marketing/Pricing";
import { IconInvoice, IconWarehouse, IconUsers, IconExpense, IconChart, IconProjects } from "@/components/Icons";

const features = [
  { Icon: IconInvoice, title: "Фактуриране", desc: "Фактури, проформи, оферти, кредитни и дебитни известия, приемо-предавателни протоколи — с автоматична номерация и двойно EUR/BGN обозначаване." },
  { Icon: IconWarehouse, title: "Склад", desc: "Управление на наличности, заприходяване, изписване и производство в множество локации." },
  { Icon: IconUsers, title: "Клиенти и Доставчици", desc: "CRM бележки, досиета, история на документи и договори за всеки контрагент." },
  { Icon: IconExpense, title: "Разходи", desc: "Ръчно въвеждане и входящи фактури от доставчици по персонализирани категории." },
  { Icon: IconChart, title: "Финансови Анализи", desc: "Оборот, паричен поток, финансова цел, данъчен календар и инвеститорски PDF отчет." },
  { Icon: IconProjects, title: "Проекти и Договори", desc: "Проследяване на приходи, разходи и печалба по проект с напомняния за договори." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--brass-soft)",
            border: "1px solid rgba(166,130,47,.3)",
            borderRadius: 20,
            padding: "5px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--brass)",
            marginBottom: 28,
          }}
        >
          ✦ Ново — двойно EUR/BGN обозначаване до 08.08.2026 включено
        </div>

        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(38px, 6vw, 72px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "var(--ink)",
            margin: "0 0 24px",
          }}
        >
          Бизнес платформата,<br />
          <span style={{ color: "var(--emerald)" }}>която расте с вас</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--ink-soft)",
            maxWidth: 580,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          Фактуриране, склад, разходи и финансови анализи в едно —
          проектирано за фирми с всякакъв капацитет в България: от малки и средни до големи компании.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
            Започни безплатно →
          </Link>
          <Link href="/software" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 28px" }}>
            Разгледай функциите
          </Link>
        </div>

        <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>
          5 документа/месец безплатно завинаги
        </p>
      </section>

      {/* Features grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="glass panel"
              style={{ padding: "22px 24px" }}
            >
              <div className="icon-tile" style={{ marginBottom: 14 }}><f.Icon /></div>
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

      {/* Stats bar */}
      <section
        className="glass"
        style={{ margin: "0 32px 80px", borderRadius: 14 }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            { num: "2", unit: "мин", label: "за регистрация" },
            { num: "1,95583", unit: "лв/EUR", label: "фиксиран курс" },
            { num: "20 / 9 / 0", unit: "%", label: "ДДС ставки" },
            { num: "SAF-T", unit: "", label: "готовност от старт" },
          ].map((s) => (
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
            description:
              "Уеб софтуер за фактуриране, склад, разходи и финансови анализи за малки и средни фирми в България.",
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
