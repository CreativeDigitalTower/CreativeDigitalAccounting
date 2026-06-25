import Link from "next/link";
import { Pricing } from "@/components/marketing/Pricing";
import {
  IconInvoice, IconWarehouse, IconUsers, IconExpense, IconChart, IconProjects,
  IconBuilding, IconDoc, IconShield, IconCash, IconCalculator, IconBank,
} from "@/components/Icons";

const features = [
  { Icon: IconInvoice, title: "Фактуриране", desc: "Фактури, проформи, оферти, кредитни и дебитни известия, приемо-предавателни протоколи и декларации за съответствие — с автоматична номерация, 10 професионални шаблона, печат и сваляне в PDF, двойно EUR/BGN обозначаване и надпис ОРИГИНАЛ." },
  { Icon: IconWarehouse, title: "Склад с проследяемост", desc: "Наличности в множество складове, категории, партидни номера, заприходяване, изписване, бракуване и ревизия (инвентаризация). Складът се обновява автоматично при фактуриране." },
  { Icon: IconBuilding, title: "Производство и рецепти", desc: "Създавайте рецепти със суровини и произвеждайте готова продукция — системата изписва съставките по метод FIFO и заприходява готовия продукт с партиден номер." },
  { Icon: IconUsers, title: "Клиенти, Доставчици и CRM", desc: "Досиета, контактни лица, CRM бележки, история на документите, приходи по клиент и топ клиенти. Редактируеми профили и автоматично предложение при въвеждане." },
  { Icon: IconExpense, title: "Разходи и Каса", desc: "Входящи фактури от доставчици по категории, каса и банкови извлечения за пълна картина на паричния поток." },
  { Icon: IconChart, title: "Финансови анализи", desc: "Оборот, печалба, марж, паричен поток, финансова цел, бизнес здравен индекс и диаграми за топ клиенти — на таблото и в детайлни справки." },
  { Icon: IconProjects, title: "Проекти и Договори", desc: "Приходи, разходи и печалба по проект, управление на договори с напомняния за изтичащи срокове." },
  { Icon: IconShield, title: "HACCP и хранителна безопасност", desc: "Технологична документация (ТД) за всеки продукт — рецептура, режими на изпичане, охлаждане, съхранение и срок на годност, съгласно изискванията на БАБХ." },
  { Icon: IconUsers, title: "Служители", desc: "Пълно досие на персонала — позиция, заплата, контакти, плюс отчет на отпуски и болнични с натрупани дни." },
  { Icon: IconDoc, title: "Документен архив", desc: "Качвайте и съхранявайте сканирани документи, договори и файлове по категории на едно сигурно място." },
  { Icon: IconCash, title: "Данъчен календар", desc: "Срокове по ЗДДС, ЗКПО, ЗДДФЛ, КСО и ГФО с предупреждения, плюс собствени напомняния, за да не пропускате задължения." },
  { Icon: IconCalculator, title: "Безплатни бизнес инструменти", desc: "Калкулатори за ДДС, заплати, валута, лихви и надценка — достъпни за всички регистрирани потребители." },
];

const highlights = [
  { Icon: IconBank, title: "Готовност за еврото", desc: "Двойно EUR/BGN обозначаване и автоматичен преход към еврото по фиксирания курс." },
  { Icon: IconShield, title: "Сигурност и роли", desc: "Потребителски роли и права, одит лог на всички действия и контрол на достъпа." },
  { Icon: IconChart, title: "Бизнес здравен индекс", desc: "Автоматична оценка 0–100 на финансовото състояние с конкретни препоръки." },
  { Icon: IconInvoice, title: "Автоматични напомняния", desc: "Известия за неплатени и просрочени фактури, за да си получавате парите навреме." },
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
          Фактуриране, склад с проследяемост, производство, HACCP, служители,
          разходи и финансови анализи — всичко в една система. Проектирано за фирми с всякакъв
          капацитет в България: от фрийлансъри и малки фирми до производство и хранителна индустрия.
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
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Всичко за вашия бизнес на едно място
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 640, marginInline: "auto" }}>
          От първата фактура до производството, складовата проследяемост и финансовите анализи.
        </p>
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

      {/* Highlights */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Защо Creative Digital Accounting
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 640, marginInline: "auto" }}>
          Една платформа вместо пет отделни програми — спестявате време, пари и грешки.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {highlights.map((h) => (
            <div key={h.title} className="glass panel" style={{ padding: "22px 24px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <div className="icon-tile" style={{ width: 50, height: 50 }}><h.Icon /></div>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Fraunces', serif", fontWeight: 700 }}>{h.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.55 }}>{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* За кого е */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div className="glass panel" style={{ padding: "28px 32px" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 14px", textAlign: "center" }}>Подходящ за всеки бизнес</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {["Търговия и онлайн магазини", "Производство", "Пекарни и хранителна индустрия (HACCP)", "Услуги и агенции", "Фрийлансъри и консултанти", "Ресторанти и кетъринг", "Строителство", "Счетоводни кантори"].map((t) => (
              <span key={t} style={{ background: "var(--emerald-soft)", color: "var(--emerald-dark)", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
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
              "Уеб софтуер за фактуриране, складова проследяемост, производство, HACCP, служители, разходи и финансови анализи за фирми в България. Готов за еврото.",
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
