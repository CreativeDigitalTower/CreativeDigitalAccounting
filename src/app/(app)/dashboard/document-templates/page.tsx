import { requireFeature } from "@/lib/session";

export default async function DocumentTemplatesPage() {
  await requireFeature("doc_templates");

  const examples = [
    "Трудови договори и анекси", "Граждански договори", "Договори за наем",
    "Пълномощни и декларации", "Споразумения за поверителност (NDA)",
    "Складови разписки и заявки", "Протоколи и заповеди", "Фирмени бланки и писма",
  ];

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Генериране на бизнес документи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Шаблони за различни видове фирмени документи — Бизнес и Про</div>
      </div>

      <div className="glass panel" style={{ padding: "28px 32px", textAlign: "center", maxWidth: 720 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🗎</div>
        <span style={{ display: "inline-block", background: "var(--brass-soft)", color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 20, padding: "3px 12px", fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>СКОРО</span>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Скоро ще можете да генерирате готови бизнес документи</h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 18px" }}>
          Подготвяме библиотека от професионални шаблони, които ще попълвате с данните на вашата фирма и контрагенти
          и ще изтегляте като PDF — без нужда от юрист за стандартните документи.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600, margin: "0 auto" }}>
          {examples.map((e) => (
            <span key={e} style={{ background: "rgba(255,255,255,.5)", border: "1px solid var(--border)", borderRadius: 16, padding: "6px 14px", fontSize: 12.5 }}>{e}</span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18 }}>Очаквайте съвсем скоро. Ще ви уведомим, когато функцията е активна.</p>
      </div>
    </>
  );
}
