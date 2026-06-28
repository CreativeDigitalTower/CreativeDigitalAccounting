import Link from "next/link";
import { Pricing } from "@/components/marketing/Pricing";

const features = [
  { emoji: "📄", title: "Фактуриране", desc: "Издавайте фактури, проформи, оферти, кредитни и дебитни известия, приемо-предавателни протоколи и други бизнес документи за секунди с автоматична номерация и професионални PDF шаблони." },
  { emoji: "📦", title: "Склад и наличности", desc: "Следете наличности, партиди, движения между складове и ревизии в реално време. Автоматизирайте заприхождаването, изписването и управлението на инвентара." },
  { emoji: "💰", title: "Разходи и паричен поток", desc: "Следете всички фирмени разходи, входящи фактури, касови операции и банкови движения с ясна финансова картина." },
  { emoji: "📊", title: "Финансови анализи", desc: "Проследявайте приходи, печалба, паричен поток, KPI показатели и бизнес здравен индекс чрез интерактивни справки и графики." },
  { emoji: "👥", title: "Клиенти, доставчици и CRM", desc: "Поддържайте пълни досиета, история на документите, приходи, договори, бележки и контакти на едно място." },
  { emoji: "🏭", title: "Производство и себестойност", desc: "Създавайте рецепти, калкулирайте себестойност, управлявайте суровини и автоматично заприхождавайте готовата продукция." },
  { emoji: "📁", title: "Документен архив", desc: "Съхранявайте всички фирмени документи, договори и файлове сигурно, организирано и винаги достъпни." },
  { emoji: "📋", title: "Проекти и договори", desc: "Управлявайте проекти, договори, бюджети, приходи, разходи и автоматични напомняния за важни срокове." },
  { emoji: "👔", title: "Служители", desc: "Управлявайте екипа си с информация за позиции, отпуски, болнични, заплати и натрупани дни в едно централизирано досие." },
  { emoji: "🛡", title: "HACCP документация", desc: "Създавайте технологични документи, рецепти и HACCP документация, съобразена с изискванията на БАБХ." },
  { emoji: "📅", title: "Данъчен календар", desc: "Получавайте автоматични напомняния за данъчни и осигурителни срокове, за да не пропускате важни задължения." },
  { emoji: "🧮", title: "Безплатни бизнес инструменти", desc: "Използвайте калкулатори за ДДС, заплати, валута, надценка, лихви и други полезни инструменти без допълнително заплащане." },
  { emoji: "🗎", title: "Генериране на бизнес документи", desc: "Готови шаблони за трудови и граждански договори, пълномощни, декларации и други фирмени документи (Бизнес и Про — очаквайте скоро)." },
];

const highlights = [
  { emoji: "🧩", title: "Всичко в една платформа", desc: "Забравете за множество отделни програми. Управлявайте фактуриране, склад, производство, финанси, CRM, документи и анализи в една система." },
  { emoji: "📈", title: "Бизнес здравен индекс", desc: "Следете финансовите резултати с графики, KPI показатели и бизнес анализи." },
  { emoji: "🔐", title: "Сигурност и контрол", desc: "Потребителски роли, контрол на достъпа, журнал на всички действия и защита на фирмените данни за максимална сигурност." },
  { emoji: "🔔", title: "Автоматични напомняния", desc: "Следете плащания, данъчни срокове, договори и важни събития без риск от пропуски." },
];

const stats = [
  { num: "17+", label: "бизнес модула" },
  { num: "100+", label: "функции" },
  { num: "15", label: "PDF шаблона" },
  { num: "12+", label: "типа документи" },
  { num: "6", label: "потребителски роли" },
  { num: "4", label: "абонаментни плана" },
];

const steps = [
  { n: "1", title: "Регистрирайте се", desc: "Създайте фирмения си профил за по-малко от 2 минути." },
  { n: "2", title: "Подгответе", desc: "Персонализирайте платформата според нуждите на вашия бизнес." },
  { n: "3", title: "Управлявайте", desc: "Фактурирайте, следете финансите и управлявайте бизнеса си от едно място." },
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
          Управлявайте целия си<br />
          <span style={{ color: "var(--emerald)" }}>бизнес от едно място</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--ink-soft)",
            maxWidth: 660,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          Creative Digital Accounting е модерна ERP платформа, която обединява фактуриране, склад,
          производство, разходи, клиенти, договори, служители и финансови анализи в една система,
          създадена специално за нуждите на българския бизнес.
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
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.emoji}</div>
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
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Защо да изберете Creative Digital Accounting
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 720, marginInline: "auto", lineHeight: 1.6 }}>
          Обединете всички основни бизнес процеси в една ERP платформа и автоматизирайте ежедневната работа на фирмата си.
          По-малко администрация. По-добър контрол. Повече време за развитие на бизнеса.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {highlights.map((h) => (
            <div key={h.title} className="glass panel" style={{ padding: "22px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{h.emoji}</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontFamily: "'Fraunces', serif", fontWeight: 700 }}>{h.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.55 }}>{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Подходящ за всяка компания */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div className="glass panel" style={{ padding: "28px 32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>Подходящ за всяка компания</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, maxWidth: 760, margin: "0 auto" }}>
            Независимо дали сте фрийлансър, търговска фирма, производител, ресторант, счетоводна кантора или развиващ се бизнес,
            Creative Digital Accounting се адаптира към вашите процеси.
          </p>
        </div>
      </section>

      {/* Какво получавате */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Какво получавате?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          {stats.map((s) => (
            <div key={s.label} className="glass panel" style={{ padding: "22px 14px", textAlign: "center" }}>
              <div className="num" style={{ fontSize: 30, fontWeight: 700, color: "var(--emerald)" }}>{s.num}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 18, fontSize: 13.5, maxWidth: 720, marginInline: "auto" }}>
          Непрекъснато надграждане и обновяване на системата с още допълнителни функции с цел подпомагане развитието на вашия бизнес.
        </p>
      </section>

      {/* Как работи */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Как работи Creative Digital Accounting</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {steps.map((s) => (
            <div key={s.n} className="glass panel" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--emerald)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, margin: "0 auto 12px" }}>{s.n}</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontFamily: "'Fraunces', serif", fontWeight: 700 }}>{s.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.55 }}>{s.desc}</p>
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
