import { requireCompany } from "@/lib/session";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";

export default async function TrainingPage() {
  await requireCompany();
  const ti = { width: 26, height: 26 };
  const topics = [
    { icon: <NavIcon.invoice {...ti} />, title: "Как се генерира фактура", desc: "Стъпка по стъпка — от клиент до изпращане и плащане." },
    { icon: <NavIcon.document {...ti} />, title: "Създаване на бизнес документи", desc: "Оферти, договори, протоколи и над 100 шаблона." },
    { icon: <UiIcon.people {...ti} />, title: "Работа с CRM", desc: "Клиентско досие, pipeline, задачи и хронология." },
    { icon: <NavIcon.warehouse {...ti} />, title: "Склад и производство", desc: "Партиди, рецепти, автоматично изписване." },
    { icon: <NavIcon.subscription {...ti} />, title: "Абонаменти и плащания", desc: "Как да изберете и управлявате своя план." },
    { icon: <NavIcon.training {...ti} />, title: "Въпроси и отговори", desc: "Често задавани въпроси и съвети от екипа." },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}><NavIcon.training width={24} height={24} /> Обучения</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Видео уроци за работа с платформата</div>
      </div>

      <div className="glass panel" style={{ padding: "44px 32px", textAlign: "center", marginBottom: 22, background: "linear-gradient(135deg, rgba(15,138,106,.08), rgba(11,94,74,.05))" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--emerald-dark)" }}><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m10 9.5 5 2.5-5 2.5V9.5Z" /></svg></div>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 14, padding: "3px 14px", marginBottom: 14 }}>СКОРО</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>Центърът за обучения е в разработка</h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Подготвяме серия видео уроци, в които стъпка по стъпка показваме как се работи с всяка част от платформата.
          Скоро ще можете да гледате обученията директно тук.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, opacity: 0.85 }}>
        {topics.map((t) => (
          <div key={t.title} className="glass panel" style={{ padding: "18px 20px", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.5, color: "var(--muted)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
            <div style={{ marginBottom: 8, color: "var(--emerald-dark)" }}>{t.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
