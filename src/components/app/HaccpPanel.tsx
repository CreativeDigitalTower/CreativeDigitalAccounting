"use client";

import { useState } from "react";
import Link from "next/link";

export type TD = Record<string, string | null> & { id: string; productName: string };

const FIELDS: { key: string; label: string; area?: boolean; rows?: number; ph?: string }[] = [
  { key: "docNumber", label: "Номер на ТД", ph: "ТД-01/2025" },
  { key: "productName", label: "Наименование на готовата храна *", ph: "Торта" },
  { key: "purpose", label: "Предназначение", area: true, rows: 2, ph: "За директна консумация от потребители…" },
  { key: "classification", label: "Класификация", area: true, rows: 2, ph: "Торта Ритц; Торта Чиприани" },
  { key: "ingredients", label: "Съставки", area: true, rows: 3 },
  { key: "rawMaterials", label: "Суровини", area: true, rows: 3 },
  { key: "packaging", label: "Опаковъчни и спомагателни материали", area: true, rows: 2 },
  { key: "preparation", label: "Подготовка на суровините", area: true, rows: 3 },
  { key: "process", label: "Описание на технологичния процес", area: true, rows: 5 },
  { key: "bakingTime", label: "Време на изпичане", ph: "40–45 min" },
  { key: "bakingTemp", label: "Температура на изпичане", ph: "180 °C" },
  { key: "cooling", label: "Охлаждане", ph: "при стайна температура" },
  { key: "organoleptic", label: "Органолептични показатели (външен вид, цвят, мирис, вкус)", area: true, rows: 3 },
  { key: "physicochemical", label: "Физикохимични показатели", area: true, rows: 2 },
  { key: "microbiological", label: "Микробиологични показатели", area: true, rows: 3 },
  { key: "samplingMethods", label: "Методи за вземане на проби и лабораторен анализ", area: true, rows: 3 },
  { key: "labeling", label: "Опаковане, етикетиране и маркировка", area: true, rows: 3 },
  { key: "storage", label: "Съхранение (температура)", ph: "0 ÷ 4 °C" },
  { key: "shelfLife", label: "Срок на годност", ph: "до 72 часа" },
  { key: "storageConditions", label: "Условия за съхранение/транспорт", ph: "сухо и хладно място" },
  { key: "transport", label: "Транспорт", ph: "без транспорт / хладилен" },
  { key: "productionControl", label: "Производствен контрол (входящ/технологичен)", area: true, rows: 3 },
  { key: "notes", label: "Допълнителни бележки", area: true, rows: 2 },
];

const empty: Record<string, string> = Object.fromEntries(FIELDS.map((f) => [f.key, ""]));

export function HaccpPanel({ initial }: { initial: TD[] }) {
  const [docs, setDocs] = useState<TD[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [error, setError] = useState("");

  function startAdd() { setForm(empty); setEditing(null); setShowForm(true); setError(""); window.scrollTo({ top: 0 }); }
  function startEdit(d: TD) {
    const f: Record<string, string> = { ...empty };
    for (const k of Object.keys(empty)) f[k] = (d[k] as string) ?? "";
    setForm(f); setEditing(d.id); setShowForm(true); setError(""); window.scrollTo({ top: 0 });
  }
  async function reload() { const r = await fetch("/api/technological-docs"); if (r.ok) setDocs(await r.json()); }
  async function save() {
    setError("");
    if (!form.productName.trim()) { setError("Въведете наименование на продукта."); return; }
    const res = await fetch(editing ? `/api/technological-docs/${editing}` : "/api/technological-docs", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); reload(); } else setError((await res.json()).error ?? "Грешка.");
  }
  async function remove(id: string) {
    if (!confirm("Изтриване на документа?")) return;
    const res = await fetch(`/api/technological-docs/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>HACCP — Безопасност на храните</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Технологична документация (ТД) съгласно изискванията на БАБХ</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>+ Нова ТД</button>
      </div>

      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 16, borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 8px" }}>Изисквания по HACCP (БАБХ)</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
          <li>Анализ на опасностите (биологични, химични, физични) по етапи на процеса</li>
          <li>Критични контролни точки (ККТ), критични граници, мониторинг и записи</li>
          <li>Коригиращи действия, верификация и вътрешни одити</li>
          <li>Добри производствени и хигиенни практики (ДПП/ДХП), проследяемост на партидите</li>
          <li>Технологична документация за всеки продукт (рецептура, режими, съхранение)</li>
        </ul>
      </div>

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? "Редакция на ТД" : "Нова технологична документация"}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ gridColumn: f.area ? "1 / -1" : undefined }}>
                <label>{f.label}</label>
                {f.area
                  ? <textarea rows={f.rows ?? 2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} />
                  : <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Запази</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Няма технологична документация.</div>
        ) : (
          <table>
            <thead><tr><th>Номер</th><th>Продукт</th><th>Срок</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{d.docNumber ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>{d.productName}</td>
                  <td style={{ fontSize: 13 }}>{d.shelfLife ?? "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/haccp/${d.id}`} className="btn btn-ghost btn-sm">Преглед / PDF</Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(d)}>✎</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(d.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
