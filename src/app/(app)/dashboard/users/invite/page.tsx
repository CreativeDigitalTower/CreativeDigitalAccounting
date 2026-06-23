"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InviteUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(""); setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), role: fd.get("role") }),
    });
    setSaving(false);
    if (res.ok) { setOk(true); setTimeout(() => router.push("/dashboard/users"), 1200); }
    else setError((await res.json()).error ?? "Грешка.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/users" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Потребители</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Добави потребител</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {ok && <div style={{ background: "var(--emerald-soft)", border: "1px solid var(--emerald)", color: "var(--emerald)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>✓ Потребителят е добавен към фирмата.</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 18px" }}>
            Потребителят трябва първо да има регистриран акаунт. Въведете имейла му и изберете роля — той ще получи достъп до тази фирма.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div><label>Имейл *</label><input type="email" name="email" required placeholder="kolega@firma.bg" /></div>
            <div><label>Роля *</label>
              <select name="role" required defaultValue="viewer">
                <option value="manager">Мениджър</option>
                <option value="accountant">Счетоводител</option>
                <option value="sales">Продажби</option>
                <option value="warehouse">Склад</option>
                <option value="viewer">Преглед</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/users" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Добавяне…" : "Добави"}</button>
        </div>
      </form>
    </>
  );
}
