"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "free";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"account" | "company">("account");
  const [accountData, setAccountData] = useState({ name: "", email: "", password: "" });

  async function handleAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAccountData({
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });
    setStep("company");
  }

  async function handleCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...accountData,
        companyName: fd.get("companyName"),
        eik: fd.get("eik"),
        plan,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Грешка при регистрацията.");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      <div className="glass panel" style={{ padding: "40px 36px" }}>
        {/* Steps indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {["Акаунт", "Фирма"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: (i === 0 && step === "account") || (i === 1 && step === "company")
                    ? "var(--emerald)"
                    : i === 0 && step === "company"
                    ? "var(--emerald)"
                    : "var(--border)",
                  color: (i === 0 && step === "company") || (i === 1 && step === "company")
                    ? "#fff"
                    : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {i === 0 && step === "company" ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>{s}</span>
              {i === 0 && <span style={{ color: "var(--border)", fontSize: 16 }}>›</span>}
            </div>
          ))}
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>
          {step === "account" ? "Създай акаунт" : "Регистрирай фирма"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 24px" }}>
          {step === "account"
            ? "Въведете данните за вашия личен акаунт"
            : "Въведете данните за вашата фирма"}
        </p>

        {error && (
          <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {step === "account" ? (
          <form onSubmit={handleAccount} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label>Пълно име</label>
              <input type="text" name="name" required placeholder="Иван Иванов" />
            </div>
            <div>
              <label>Имейл адрес</label>
              <input type="email" name="email" required placeholder="ivan@firma.bg" />
            </div>
            <div>
              <label>Парола (мин. 8 символа)</label>
              <input type="password" name="password" required minLength={8} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>
              Следваща стъпка →
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompany} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label>Наименование на фирмата</label>
              <input type="text" name="companyName" required placeholder="ЕООД Примерна" />
            </div>
            <div>
              <label>ЕИК / Булстат</label>
              <input type="text" name="eik" placeholder="123456789" />
            </div>
            <div
              style={{
                background: "var(--emerald-soft)",
                border: "1px solid rgba(31,111,84,.2)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12.5,
                color: "var(--emerald)",
              }}
            >
              ✓ План: <strong>{plan === "free" ? "Безплатен (5 документа/месец)" : plan}</strong>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Регистрация…" : "Завърши регистрацията →"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep("account")} style={{ justifyContent: "center" }}>
              ← Назад
            </button>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
          Вече имате акаунт?{" "}
          <Link href="/login" style={{ color: "var(--navy)", fontWeight: 600 }}>Вход</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
