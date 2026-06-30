import { requireCompany } from "@/lib/session";

export default async function TrainingPage() {
  await requireCompany();
  const topics = [
    { icon: "🧾", title: "Как се генерира фактура", desc: "Стъпка по стъпка — от клиент до изпращане и плащане." },
    { icon: "📄", title: "Създаване на бизнес документи", desc: "Оферти, договори, протоколи и над 100 шаблона." },
    { icon: "👥", title: "Работа с CRM", desc: "Клиентско досие, pipeline, задачи и хронология." },
    { icon: "📦", title: "Склад и производство", desc: "Партиди, рецепти, автоматично изписване." },
    { icon: "💳", title: "Абонаменти и плащания", desc: "Как да изберете и управлявате своя план." },
    { icon: "❓", title: "Въпроси и отговори", desc: "Често задавани въпроси и съвети от екипа." },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 4px" }}>🎓 Обучения</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Видео уроци за работа с платформата</div>
      </div>

      <div className="glass panel" style={{ padding: "44px 32px", textAlign: "center", marginBottom: 22, background: "linear-gradient(135deg, rgba(15,138,106,.08), rgba(11,94,74,.05))" }}>
        <div style={{ fontSize: 46, marginBottom: 12 }}>🎬</div>
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
            <div style={{ position: "absolute", top: 14, right: 14, fontSize: 16, opacity: 0.5 }}>🔒</div>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
