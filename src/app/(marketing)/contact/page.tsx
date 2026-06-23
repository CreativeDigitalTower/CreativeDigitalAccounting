"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire to email API
    setSent(true);
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 32px 100px" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, margin: "0 0 12px" }}>
        Контакти
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 40, fontSize: 15 }}>
        Имате въпрос или предложение? Пишете ни и ще отговорим в рамките на работен ден.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
        {[
          { icon: "✉️", label: "Имейл", value: "info@creativedigital.bg" },
          { icon: "📍", label: "Адрес", value: "София, България" },
        ].map((c) => (
          <div key={c.label} className="glass panel" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {sent ? (
        <div
          className="glass"
          style={{ padding: "32px", borderRadius: 14, textAlign: "center", borderLeft: "4px solid var(--emerald)" }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <h3 style={{ fontFamily: "'Fraunces', serif", margin: "0 0 8px" }}>Съобщението е изпратено!</h3>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>Ще ви отговорим до 1 работен ден.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass panel" style={{ padding: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label>Име</label>
              <input type="text" required placeholder="Иван Иванов" />
            </div>
            <div>
              <label>Имейл</label>
              <input type="email" required placeholder="ivan@firma.bg" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Фирма (незадължително)</label>
            <input type="text" placeholder="ООД Примерна" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>Съобщение</label>
            <textarea required rows={5} placeholder="Как можем да помогнем?" style={{ resize: "vertical" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Изпрати съобщение
          </button>
        </form>
      )}
    </div>
  );
}
