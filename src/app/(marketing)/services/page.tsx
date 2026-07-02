import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Услуги — уеб, маркетинг, реклами и дигитално обслужване",
  description: "Освен счетоводния софтуер предлагаме и всички дигитални услуги за развитието на вашия бизнес: изработка и поддръжка на сайт, маркетинг, графичен дизайн, реклами и управление на социални мрежи. Фирма с дългогодишен и доказан опит.",
};

const SERVICES: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: "Изработка и поддръжка на сайт",
    text: "Модерни, бързи и адаптивни уебсайтове и онлайн магазини — с постоянна техническа поддръжка и обновяване.",
    icon: <IconMonitor />,
  },
  {
    title: "Маркетинг",
    text: "Цялостни маркетингови стратегии, които водят реални клиенти и растеж — базирани на данни и доказан опит.",
    icon: <IconTrend />,
  },
  {
    title: "Графичен дизайн",
    text: "Лого, фирмена идентичност, рекламни материали и визии, които открояват бранда ви професионално.",
    icon: <IconPen />,
  },
  {
    title: "Създаване и управление на реклами",
    text: "Изграждане, оптимизация и управление на рекламни кампании във Facebook, Instagram и Google.",
    icon: <IconMegaphone />,
  },
  {
    title: "Поддръжка на социални мрежи",
    text: "Съдържание, публикации и активно управление на социалните ви профили, за да сте видими и активни.",
    icon: <IconChat />,
  },
  {
    title: "Цялостно дигитално обслужване",
    text: "Пълно маркетингово и дигитално обслужване на бизнеса ви — от стратегия до изпълнение, на едно място.",
    icon: <IconGrid />,
  },
];

export default function ServicesPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 32px 100px" }}>
      <div style={{ marginBottom: 44, maxWidth: 680 }}>
        <div style={{ display: "inline-block", background: "var(--emerald-soft)", color: "var(--emerald-dark)", borderRadius: 20, padding: "5px 16px", fontSize: 12.5, fontWeight: 700, letterSpacing: 1, marginBottom: 18 }}>
          ДИГИТАЛНИ УСЛУГИ
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 20px" }}>
          Всичко за цялостното развитие на вашия бизнес
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          Освен нашия счетоводен и бизнес софтуер, предлагаме и пълен набор от дигитални услуги. Ние сме фирма с
          <strong> дългогодишен и доказан опит</strong> в тази сфера — помагаме на бизнеси да растат онлайн от идея до резултат.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 44 }}>
        {SERVICES.map((s) => (
          <div key={s.title} className="glass panel" style={{ padding: "26px 24px" }}>
            <div className="icon-tile" style={{ width: 46, height: 46, borderRadius: 13, marginBottom: 16 }}>{s.icon}</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 10px" }}>{s.title}</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "36px 32px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, margin: "0 0 12px" }}>
          Искате да развием бизнеса ви заедно?
        </h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Свържете се с нас, за да обсъдим как можем да помогнем — с една или всички от изброените услуги.
        </p>
        <Link href="/contact" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
          Свържете се с нас →
        </Link>
      </div>
    </div>
  );
}

/* ── SVG пиктограми (без емоджита) ── */
function IconMonitor() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="19" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></svg>;
}
function IconTrend() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M15 8h5v5" /></svg>;
}
function IconPen() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
}
function IconMegaphone() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M14 8a4 4 0 0 1 0 8" /></svg>;
}
function IconChat() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z" /></svg>;
}
function IconGrid() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}
