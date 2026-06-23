import Link from "next/link";

const features = [
  {
    icon: "📄",
    title: "Фактуриране",
    desc: "Фактури, проформи, оферти, кредитни и дебитни известия с автоматична номерация и двойно EUR/BGN обозначаване.",
  },
  {
    icon: "📦",
    title: "Склад",
    desc: "Управление на наличности, заприходяване, изписване и производство в множество локации.",
  },
  {
    icon: "👥",
    title: "Клиенти и Доставчици",
    desc: "CRM бележки, досиета, история на документи и договори за всеки контрагент.",
  },
  {
    icon: "💰",
    title: "Разходи",
    desc: "Ръчно въвеждане и входящи фактури от доставчици по персонализирани категории.",
  },
  {
    icon: "📊",
    title: "Финансови Анализи",
    desc: "Оборот, паричен поток, финансова цел, данъчен календар и инвеститорски PDF отчет.",
  },
  {
    icon: "🏗️",
    title: "Проекти и Договори",
    desc: "Проследяване на приходи, разходи и печалба по проект с напомняния за договори.",
  },
];

const plans = [
  {
    name: "Безплатен",
    price: "0",
    desc: "За стартиращи",
    features: ["5 документа/месец", "Неограничени клиенти", "Склад", "Базов анализ"],
    cta: "Започни безплатно",
    href: "/register",
    highlight: false,
  },
  {
    name: "Старт",
    price: "19",
    desc: "€/месец",
    features: ["50 документа/месец", "Повтарящи се фактури", "Разходи", "CRM бележки"],
    cta: "Опитай 14 дни",
    href: "/register?plan=start",
    highlight: false,
  },
  {
    name: "Бизнес",
    price: "49",
    desc: "€/месец",
    features: ["200 документа/месец", "Проекти", "Договори", "Финансов отчет PDF"],
    cta: "Опитай 14 дни",
    href: "/register?plan=business",
    highlight: true,
    ribbon: "Препоръчан",
  },
  {
    name: "Про",
    price: "99",
    desc: "€/месец",
    features: ["Неограничени документи", "Активи и амортизация", "Многофирмен достъп", "Приоритетна поддръжка"],
    cta: "Опитай 14 дни",
    href: "/register?plan=pro",
    highlight: false,
  },
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
          проектирано за малки и средни фирми в България.
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
          Без кредитна карта · 5 документа/месец безплатно завинаги
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
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Fraunces', serif" }}>
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
            { num: "5", unit: "мин", label: "за регистрация" },
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
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 100px" }}>
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Абонаментни планове
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 40, fontSize: 14 }}>
          Всички цени без ДДС. 1 EUR = {(1.95583).toFixed(5)} лв.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="glass panel"
              style={{
                padding: "24px 20px",
                position: "relative",
                border: plan.highlight ? "2px solid var(--brass)" : undefined,
              }}
            >
              {plan.ribbon && <span className="ribbon">{plan.ribbon}</span>}
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginBottom: 2 }}>
                {plan.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 700, margin: "10px 0 2px" }}>
                {plan.price}
                <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "inherit", fontWeight: 400 }}>
                  {" "}{plan.desc}
                </span>
              </div>
              {plan.price !== "0" && (
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 16 }}>
                  ≈ {(parseFloat(plan.price) * 1.95583).toFixed(2)} лв/месец
                </div>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={plan.highlight ? "btn btn-primary" : "btn btn-ghost"}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
