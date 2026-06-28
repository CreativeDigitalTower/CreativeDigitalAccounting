import Link from "next/link";

const modules = [
  {
    icon: "📄",
    title: "Документи",
    items: [
      "Фактури, проформи, оферти, кредитни и дебитни известия",
      "Приемо-предавателни протоколи (ППП) и декларации за съответствие",
      "Генериране на бизнес документи (договори, пълномощни и др. — Бизнес/Про, скоро)",
      "Автоматична номерация по тип и година (CDA-2026-####)",
      "Документна верига: Оферта → Проформа → Фактура",
      "15 професионални шаблона за фактури с различна стилистика",
      "Двойно EUR/BGN обозначаване (задължително до 08.08.2026)",
      "Повтарящи се (абонаментни) фактури",
      "Статуси: чернова, изпратена, платена, просрочена, анулирана",
    ],
  },
  {
    icon: "👥",
    title: "Клиенти и Доставчици",
    items: [
      "Пълно досие на клиент с история на документи",
      "CRM бележки за всеки клиент",
      "ЕИК/VIES автопопълване при регистрация",
      "Доставчици с рейтинг, история и прикачени документи",
      "Приходи/разходи по контрагент",
    ],
  },
  {
    icon: "📦",
    title: "Склад",
    items: [
      "Множество локации/складове",
      "Заприходяване от доставчик",
      "Изписване и производство (разпад на материали)",
      "Алерт при достигане на минимална наличност",
      "Пълна история на движенията",
    ],
  },
  {
    icon: "💰",
    title: "Разходи",
    items: [
      "Ръчно въвеждане с категории",
      "Входящи фактури от доставчици",
      "Персонализирани категории разходи",
      "Прикачване на файлове (PDF, снимка)",
      "Проследяване на ДДС по разходи",
    ],
  },
  {
    icon: "📊",
    title: "Финансови Анализи",
    items: [
      "Оборот и разходи по период",
      "Паричен поток",
      "Финансова цел за годината",
      "Данъчен календар",
      "Инвеститорски PDF отчет",
      "\"Финансово здраве\" индикатор (правилово, без AI)",
    ],
  },
  {
    icon: "🏗️",
    title: "Проекти",
    items: [
      "Приходи и разходи по проект",
      "Реален процент на изпълнение",
      "Отговорен потребител и срок",
      "Прикачени файлове",
      "Бюджет планиран vs. реален",
    ],
  },
  {
    icon: "📑",
    title: "Договори",
    items: [
      "Клиентски и доставчически договори",
      "Напомняне за изтичане",
      "Автоматично подновяване",
      "Прикачен PDF на договора",
    ],
  },
  {
    icon: "🏭",
    title: "Активи",
    items: [
      "Регистър на дълготрайните активи",
      "Автоматична амортизация",
      "Гаранция и застраховка",
      "Сервизен дневник",
    ],
  },
  {
    icon: "💳",
    title: "Абонамент",
    items: [
      "Freemium модел — 5 документа/месец безплатно",
      "Stripe billing с автоматично таксуване",
      "Upgrade/downgrade по всяко време",
      "4 плана: Безплатен, Старт, Бизнес, Про",
    ],
  },
];

export default function SoftwarePage() {
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
          Всичко, от което<br />
          <span style={{ color: "var(--emerald)" }}>вашият бизнес се нуждае</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 32px" }}>
          Платформата обхваща целия финансов цикъл —
          от офертата до получаването на плащането.
        </p>
        <Link href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
          Започни безплатно →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        {modules.map((mod) => (
          <div key={mod.title} className="glass panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{mod.icon}</div>
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
        <strong style={{ color: "var(--navy)", fontSize: 13 }}>SAF-T Готовност</strong>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
          България въвежда задължително SAF-T отчитане поетапно — големи фирми от 2026 г., МСП от 2027 г.
          Платформата съхранява <code>nomenclature_code</code> от самото начало,
          за да е пълна съвместимост без реструктуриране на база данни.
        </p>
      </div>
    </div>
  );
}
