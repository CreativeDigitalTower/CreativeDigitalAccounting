"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEFAULT_STANDARDS = "Регламент (ЕС) № 1169/2011 за предоставяне на информация за храните на потребителите; Регламент (ЕО) № 852/2004 относно хигиената на храните; Закон за храните; БДС приложими стандарти.";

export function DeclarationForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    number: "", productName: "", batchNumber: "", issuedFor: "",
    standards: DEFAULT_STANDARDS, description: "", date: new Date().toISOString().slice(0, 10), signedBy: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/declarations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, number: form.number || undefined }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/documents/declarations");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents/declarations" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Декларации</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нова декларация за съответствие</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={submit}>
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 14 }}>
            <div><label>Номер (по избор — авто)</label><input value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="ДС-2026-0001" /></div>
            <div><label>Дата *</label><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Наименование на продукта *</label><input value={form.productName} onChange={(e) => set("productName", e.target.value)} required /></div>
            <div><label>Партиден номер</label><input value={form.batchNumber} onChange={(e) => set("batchNumber", e.target.value)} /></div>
            <div><label>Издадена за (получател)</label><input value={form.issuedFor} onChange={(e) => set("issuedFor", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Приложими стандарти и нормативни изисквания</label><textarea rows={3} value={form.standards} onChange={(e) => set("standards", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Описание / Декларирано съответствие</label><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Декларираме, че продуктът отговаря на изискванията за безопасност…" /></div>
            <div><label>Подписал (МОЛ)</label><input value={form.signedBy} onChange={(e) => set("signedBy", e.target.value)} /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/documents/declarations" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Създай декларация"}</button>
        </div>
      </form>
    </>
  );
}
