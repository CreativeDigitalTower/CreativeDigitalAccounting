"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email") }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="glass panel" style={{ padding: "40px 36px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Забравена парола</h1>
        {sent ? (
          <>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 24px", lineHeight: 1.6 }}>
              Ако съществува акаунт с този имейл, изпратихме линк за смяна на паролата. Проверете пощата си (и папка „Спам“).
            </p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }}>Назад към вход</Link>
          </>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 24px" }}>Въведете имейла си и ще получите линк за нова парола.</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label>Имейл адрес</label>
                <input type="email" name="email" required placeholder="ivan@firma.bg" autoComplete="email" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Изпращане…" : "Изпрати линк"}
              </button>
            </form>
            <p style={{ marginTop: 24, textAlign: "center", fontSize: 13.5 }}>
              <Link href="/login" style={{ color: "var(--navy)", fontWeight: 600 }}>← Назад към вход</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
