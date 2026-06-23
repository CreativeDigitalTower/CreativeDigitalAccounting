"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewAssetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"), category: fd.get("category"),
        acquiredDate: fd.get("acquiredDate"), value: Number(fd.get("value")),
        annualDepreciation: fd.get("annualDepreciation") ? Number(fd.get("annualDepreciation")) : 0,
        warrantyUntil: fd.get("warrantyUntil") || null,
        insuranceUntil: fd.get("insuranceUntil") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/assets");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/assets" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Активи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов актив</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>Наименование *</label><input type="text" name="name" required placeholder="Лаптоп Dell / Автомобил…" /></div>
            <div><label>Категория *</label>
              <select name="category" required defaultValue="">
                <option value="" disabled>Изберете</option>
                {["Машини и оборудване","Компютри и техника","Транспортни средства","Обзавеждане","Сгради","Нематериални активи","Други"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label>Придобит на *</label><input type="date" name="acquiredDate" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div><label>Стойност (EUR) *</label><input type="number" name="value" step="0.01" min="0" required /></div>
            <div><label>Год. амортизация (EUR)</label><input type="number" name="annualDepreciation" step="0.01" min="0" defaultValue={0} /></div>
            <div><label>Гаранция до</label><input type="date" name="warrantyUntil" /></div>
            <div><label>Застраховка до</label><input type="date" name="insuranceUntil" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/assets" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Запази"}</button>
        </div>
      </form>
    </>
  );
}
