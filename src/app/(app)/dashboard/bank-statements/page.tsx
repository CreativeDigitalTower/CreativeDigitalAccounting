"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Statement = {
  id: string; name: string; fileType: string;
  periodFrom: string | null; periodTo: string | null; note: string | null; createdAt: string;
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "var(--brick)" },
  excel: { label: "EXCEL", color: "var(--emerald)" },
  csv: { label: "CSV", color: "var(--navy)" },
};

function detectType(file: File): "pdf" | "excel" | "csv" | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".xls") || n.endsWith(".xlsx")) return "excel";
  if (n.endsWith(".csv")) return "csv";
  return null;
}

export default function BankStatementsPage() {
  const [items, setItems] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [file, setFile] = useState<{ data: string; type: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const d = await fetch("/api/bank-statements").then((r) => r.json());
    setItems(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const type = detectType(f);
    if (!type) { setError("Поддържат се само PDF, Excel (.xls/.xlsx) и CSV файлове."); return; }
    if (f.size > 8 * 1024 * 1024) { setError("Файлът трябва да е под 8MB."); return; }
    setError("");
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => setFile({ data: reader.result as string, type, name: f.name });
    reader.readAsDataURL(f);
  }

  async function upload() {
    if (!file || !name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/bank-statements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fileUrl: file.data, fileType: file.type, periodFrom: periodFrom || null, periodTo: periodTo || null }),
    });
    setSaving(false);
    if (res.ok) { setName(""); setFile(null); setPeriodFrom(""); setPeriodTo(""); load(); }
    else setError("Грешка при качване.");
  }

  async function download(id: string, fname: string) {
    const d = await fetch(`/api/bank-statements/${id}`).then((r) => r.json());
    if (d.fileUrl) {
      const a = document.createElement("a");
      a.href = d.fileUrl; a.download = fname; a.click();
    }
  }

  async function remove(id: string) {
    if (!confirm("Изтриване на извлечението?")) return;
    await fetch(`/api/bank-statements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Документи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Банкови извлечения</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/documents" className="filter-tab">Всички</Link>
        <Link href="/dashboard/documents?type=invoice" className="filter-tab">Приходни фактури</Link>
        <Link href="/dashboard/expenses" className="filter-tab">Разходни фактури</Link>
        <span className="filter-tab active">Банкови извлечения</span>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Upload */}
      <div className="glass panel" style={{ padding: "20px 24px", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Качи извлечение (PDF / Excel / CSV)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label>Наименование</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Извлечение ДСК Юни 2026" />
          </div>
          <div>
            <label>Период от</label>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
          </div>
          <div>
            <label>Период до</label>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          </div>
          <div>
            <label>Файл</label>
            <input type="file" accept=".pdf,.xls,.xlsx,.csv" onChange={onFile} style={{ fontSize: 12.5 }} />
          </div>
          <button onClick={upload} className="btn btn-primary" disabled={saving || !file || !name.trim()}>
            {saving ? "Качване…" : "Качи"}
          </button>
        </div>
        {file && <div style={{ fontSize: 12, color: "var(--emerald)", marginTop: 8 }}>✓ Готов за качване: {file.name}</div>}
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {loading ? (
          <div style={{ padding: 30, color: "var(--muted)" }}>Зареждане…</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
            <div style={{ fontSize: 14 }}>Няма качени банкови извлечения</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Тип</th>
                <th>Период</th>
                <th>Качено на</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_BADGE[s.fileType]?.color, border: `1px solid ${TYPE_BADGE[s.fileType]?.color}`, borderRadius: 5, padding: "2px 8px" }}>
                      {TYPE_BADGE[s.fileType]?.label ?? s.fileType}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    {s.periodFrom ? new Date(s.periodFrom).toLocaleDateString("bg-BG") : "—"}
                    {s.periodTo ? ` – ${new Date(s.periodTo).toLocaleDateString("bg-BG")}` : ""}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(s.createdAt).toLocaleDateString("bg-BG")}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => download(s.id, s.name)} className="btn btn-ghost btn-sm">↓ Свали</button>
                    <button onClick={() => remove(s.id)} className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }}>Изтрий</button>
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
