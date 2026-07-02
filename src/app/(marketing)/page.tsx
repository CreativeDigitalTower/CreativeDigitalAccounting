import Link from "next/link";
import { Pricing } from "@/components/marketing/Pricing";
import {
  IconInvoice, IconWarehouse, IconExpense, IconChart, IconUsers, IconFactory,
  IconDoc, IconProjects, IconShield, IconCalendar, IconFileStack, IconBuilding,
  IconBank,
} from "@/components/Icons";

const features = [
  { Icon: IconInvoice, title: "Фактуриране", desc: "Издавайте фактури, проформи, оферти, кредитни и дебитни известия, приемо-предавателни протоколи и други бизнес документи за секунди с автоматична номерация и професионални PDF шаблони." },
  { Icon: IconWarehouse, title: "Склад и наличности", desc: "Следете наличности, партиди, движения между складове и ревизии в реално време. Автоматизирайте заприхождаването, изписването и управлението на инвентара." },
  { Icon: IconExpense, title: "Разходи и паричен поток", desc: "Следете всички фирмени разходи, входящи фактури, касови операции и банкови движения с ясна финансова картина." },
  { Icon: IconChart, title: "Финансови анализи", desc: "Проследявайте приходи, печалба, паричен поток, KPI показатели и бизнес здравен индекс чрез интерактивни справки и графики." },
  { Icon: IconUsers, title: "Клиенти, доставчици и CRM", desc: "Поддържайте пълни досиета, история на документите, приходи, договори, бележки и контакти на едно място." },
  { Icon: IconFactory, title: "Производство и себестойност", desc: "Създавайте рецепти, калкулирайте себестойност, управлявайте суровини и автоматично заприхождавайте готовата продукция." },
  { Icon: IconDoc, title: "Документен архив", desc: "Съхранявайте всички фирмени документи, договори и файлове сигурно, организирано и винаги достъпни." },
  { Icon: IconProjects, title: "Проекти и договори", desc: "Управлявайте проекти, договори, бюджети, приходи, разходи и автоматични напомняния за важни срокове." },
  { Icon: IconBuilding, title: "Служители", desc: "Управлявайте екипа си с информация за позиции, отпуски, болнични, заплати и натрупани дни в едно централизирано досие." },
  { Icon: IconShield, title: "HACCP документация", desc: "Създавайте технологични документи, рецепти и HACCP документация, съобразена с изискванията на БАБХ." },
  { Icon: IconCalendar, title: "Данъчен календар", desc: "Получавайте автоматични напомняния за данъчни и осигурителни срокове, за да не пропускате важни задължения." },
  { Icon: IconFileStack, title: "Генериране на бизнес документи", desc: "Над 100 готови шаблона за договори, заповеди, пълномощни, протоколи и декларации — попълнени автоматично с данните на вашата фирма (Бизнес и Про)." },
];

const highlights = [
  { Icon: IconFileStack, title: "Всичко в една платформа", desc: "Забравете за множество отделни програми. Управлявайте фактуриране, склад, производство, финанси, CRM, документи и анализи в една система." },
  { Icon: IconChart, title: "Бизнес здравен индекс", desc: "Следете финансовите резултати с графики, KPI показатели и бизнес анализи." },
  { Icon: IconShield, title: "Сигурност и контрол", desc: "Потребителски роли, контрол на достъпа, журнал на всички действия и защита на фирмените данни за максимална сигурност." },
  { Icon: IconBank, title: "Автоматични напомняния", desc: "Следете плащания, данъчни срокове, договори и важни събития без риск от пропуски." },
];

const stats = [
  { num: "17+", label: "бизнес модула" },
  { num: "100+", label: "функции" },
  { num: "100+", label: "шаблони за документи" },
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
      {/* Hero — асиметричен, оригинален layout */}
      <section className="home-hero" style={{ maxWidth: 1200, margin: "0 auto", padding: "68px 32px 56px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 48, alignItems: "center" }}>
        {/* Ляво: редакционен текст с вертикален акцент */}
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4, borderRadius: 4, background: "linear-gradient(var(--emerald), var(--brass))" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brass-soft)", border: "1px solid rgba(166,130,47,.3)", borderRadius: 20, padding: "5px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--brass)", marginBottom: 22 }}>
            ✦ Ново — двойно EUR/BGN обозначаване до 08.08.2026
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(36px, 5vw, 62px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-1px", color: "var(--ink)", margin: "0 0 20px" }}>
            Целият Ви бизнес,<br /><span style={{ color: "var(--emerald)" }}>подреден на едно място.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.4vw, 18px)", color: "var(--ink-soft)", maxWidth: 520, margin: "0 0 30px", lineHeight: 1.6 }}>
            Фактури, склад, производство, разходи, CRM, договори и финансови анализи —
            обединени в една модерна платформа за българския бизнес.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "13px 28px" }}>Започни безплатно →</Link>
            <Link href="/software" className="btn btn-ghost" style={{ fontSize: 15, padding: "13px 28px" }}>Разгледай функциите</Link>
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: "var(--muted)" }}>
            <span>✓ Безплатен план завинаги</span>
            <span>✓ Без карта при регистрация</span>
            <span>✓ Готово за 2 минути</span>
          </div>
        </div>

        {/* Дясно: композиция от „плаващи“ карти — собствена илюстрация */}
        <div className="home-hero-art" style={{ position: "relative", minHeight: 380 }}>
          <div className="glass panel" style={{ position: "absolute", top: 0, right: 0, width: "88%", padding: "18px 20px", borderRadius: 16, boxShadow: "0 20px 50px rgba(20,30,25,.14)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14 }}>Табло</span>
              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>този месец</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Приходи", "12 480 €", "var(--emerald-dark)"], ["Разходи", "4 210 €", "var(--brick)"], ["Печалба", "8 270 €", "var(--navy)"], ["Фактури", "37", "var(--brass)"]].map(([l, v, c]) => (
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
            <div style={{ fontSize: 10.5, color: "var(--brass)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ФАКТУРА · 0000000037</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Консултация</span><span className="num">500,00 €</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}><span style={{ color: "var(--muted)" }}>Хостинг</span><span className="num">90,00 €</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 6 }}><span>Общо</span><span className="num" style={{ color: "var(--emerald-dark)" }}>590,00 €</span></div>
            <div style={{ marginTop: 8, display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--emerald)", borderRadius: 12, padding: "2px 10px" }}>● Платена</div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Платформата</div>
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
              className="glass panel hover-lift"
              style={{ padding: "22px 24px" }}
            >
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
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Предимства</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Защо да изберете Creative Digital Accounting
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: 32, fontSize: 14, maxWidth: 720, marginInline: "auto", lineHeight: 1.6 }}>
          Обединете всички основни бизнес процеси в една ERP платформа и автоматизирайте ежедневната работа на фирмата си.
          По-малко администрация. По-добър контрол. Повече време за развитие на бизнеса.
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
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>Подходящ за всяка компания</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, maxWidth: 760, margin: "0 auto" }}>
            Независимо дали сте фрийлансър, търговска фирма, производител, ресторант, счетоводна кантора или развиващ се бизнес,
            Creative Digital Accounting се адаптира към вашите процеси.
          </p>
        </div>
      </section>

      {/* Какво получавате */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Резултати</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Какво получавате?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          {stats.map((s) => (
            <div key={s.label} className="glass panel hover-lift" style={{ padding: "24px 14px", textAlign: "center" }}>
              <div className="num" style={{ fontSize: 34, fontWeight: 700, background: "linear-gradient(120deg, var(--emerald), var(--brass))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.num}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: 18, fontSize: 13.5, maxWidth: 720, marginInline: "auto" }}>
          Непрекъснато надграждане и обновяване на системата с още допълнителни функции с цел подпомагане развитието на вашия бизнес.
        </p>
      </section>

      {/* Как работи */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 70px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Лесно начало</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Как работи Creative Digital Accounting</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, position: "relative" }}>
          {steps.map((s, i) => (
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

      {/* Дигитални услуги + фирми, които ни се довериха */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 32px 80px" }}>
        <div className="glass panel" style={{ padding: "40px 32px", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "var(--emerald-soft)", color: "var(--emerald-dark)", borderRadius: 20, padding: "5px 16px", fontSize: 12.5, fontWeight: 700, letterSpacing: 1, marginBottom: 18 }}>
            И ОЩЕ НЕЩО
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, margin: "0 0 16px" }}>
            Предлагаме и всички дигитални услуги за развитието на вашия бизнес
          </h2>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 720, margin: "0 auto 22px" }}>
            Изработка и поддръжка на сайт, маркетинг, графичен дизайн, създаване и управление на реклами,
            поддръжка на социалните мрежи и цялостно маркетингово и дигитално обслужване. Ние сме фирма с
            <strong> дългогодишен и доказан опит</strong> в тази сфера. Ако желаете да се възползвате от нашите услуги — свържете се с нас.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/services" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>Разгледай услугите →</Link>
            <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>Свържи се с нас</Link>
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
