"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) { setError("Паролата трябва да е поне 8 символа."); return; }
    if (password !== fd.get("confirm")) { setError("Паролите не съвпадат."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) { setDone(true); setTimeout(() => router.push("/login"), 2500); }
    else setError("Линкът е невалиден или изтекъл. Заявете нов.");
  }

  if (!token) return <p style={{ color: "var(--muted)" }}>Невалиден линк. <Link href="/forgot-password" style={{ color: "var(--navy)" }}>Заявете нов</Link>.</p>;

  return done ? (
    <>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>Готово ✓</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Паролата е сменена. Пренасочваме Ви към вход…</p>
    </>
  ) : (
    <>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Нова парола</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 24px" }}>Задайте нова парола за акаунта си.</p>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label>Нова парола</label><input type="password" name="password" required placeholder="••••••••" autoComplete="new-password" /></div>
        <div><label>Потвърди паролата</label><input type="password" name="confirm" required placeholder="••••••••" autoComplete="new-password" /></div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}>{loading ? "Запазване…" : "Запази паролата"}</button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="glass panel" style={{ padding: "40px 36px" }}>
        <Suspense fallback={null}><ResetForm /></Suspense>
      </div>
    </div>
  );
}
