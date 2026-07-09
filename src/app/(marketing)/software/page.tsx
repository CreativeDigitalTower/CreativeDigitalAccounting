import Link from "next/link";
import { IconInvoice, IconUsers, IconWarehouse, IconExpense, IconChart, IconProjects, IconDoc, IconBuilding, IconBank } from "@/components/Icons";

// Най-новите и най-големи функционалности — представени с акцент
const highlights = [
  {
    Icon: IconProjects,
    tag: "Ново",
    title: "Управление на проекти (Project Management)",
    text: "Модерни табла за задачи по фирми и проекти — всяка фирма е отделна колона. Възлагайте задачи с приоритет, изпълнител, срок и процент на изпълнение, следете статуса и работете като екип. Отделен раздел за ежемесечни (повтарящи се) задачи по месеци и автоматичен архив на приключените за справки по периоди.",
  },
  {
    Icon: IconUsers,
    tag: "Ново",
    title: "HR портал за служители",
    text: "Пълноценен портал за самообслужване на служителите: собствен профил, онлайн молби за отпуск и одобрения, възлагане и проследяване на задачи, заплати и осигуровки. Всеки служител вижда точно това, до което има права — със сигурен, ограничен достъп.",
  },
  {
    Icon: IconChart,
    tag: "Ново",
    title: "Прогнози и симулатори за растеж",
    text: "Прогноза за задължителна ДДС регистрация спрямо оборота за календарната година, симулатори на приходи и складови цени (увеличение/намаление) и разширени анализи с KPI и историческо сравнение по години — за да вземате решения с ясна финансова картина.",
  },
];

const modules = [
  {
    Icon: IconInvoice,
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
    Icon: IconUsers,
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
    Icon: IconWarehouse,
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
    Icon: IconExpense,
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
    Icon: IconChart,
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
    Icon: IconProjects,
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
    Icon: IconDoc,
    title: "Договори",
    items: [
      "Клиентски и доставчически договори",
      "Напомняне за изтичане",
      "Автоматично подновяване",
      "Прикачен PDF на договора",
    ],
  },
  {
    Icon: IconBuilding,
    title: "Активи",
    items: [
      "Регистър на дълготрайните активи",
      "Автоматична амортизация",
      "Гаранция и застраховка",
      "Сервизен дневник",
    ],
  },
  {
    Icon: IconBank,
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

      {/* Акцент — най-новите големи функционалности */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span style={{ display: "inline-block", background: "var(--emerald-soft)", color: "var(--emerald-dark)", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "4px 14px", borderRadius: 20, marginBottom: 10 }}>НАЙ-НОВОТО В ПЛАТФОРМАТА</span>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 700, margin: 0 }}>Мощни нови функционалности</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          {highlights.map((h) => (
            <div key={h.title} className="glass panel hover-lift" style={{ padding: 24, borderTop: "3px solid var(--emerald)", position: "relative" }}>
              <span style={{ position: "absolute", top: 16, right: 16, background: "var(--brass)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: .5, padding: "2px 9px", borderRadius: 20 }}>{h.tag}</span>
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
        <strong style={{ color: "var(--navy)", fontSize: 13 }}>SAF-T Готовност — вграден модул</strong>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
          България въвежда задължително SAF-T отчитане поетапно — големи фирми от 2026 г., МСП от 2027 г.
          Платформата има <strong>вграден SAF-T модул</strong>, който генерира готовите XML файлове
          (месечни, годишни и при поискване) директно от Вашите данни — контрагенти, документи, данъци,
          главна книга и активи. Без ръчна подготовка и без реструктуриране на данните.
        </p>
      </div>
    </div>
  );
}
