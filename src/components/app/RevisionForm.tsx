"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Item = { id: string; name: string; unit: string; quantity: number };

export function RevisionForm({ items }: { items: Item[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function apply() {
    setError("");
    const lines = items
      .filter((i) => counts[i.id] !== undefined && counts[i.id] !== "")
      .map((i) => ({ stockItemId: i.id, countedQty: Number(counts[i.id]) }));
    if (lines.length === 0) { setError("Въведете поне една преброена бройка."); return; }
    setSaving(true);
    const res = await fetch("/api/warehouse/stocktake", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || null, lines }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/warehouse");
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <Link href="/dashboard/warehouse" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Склад</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Ревизия (инвентаризация)</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
        Въведете реално преброените количества. При запис складовите наличности се обновяват автоматично, а разликите се записват като движение „ревизия".
      </p>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="glass panel" style={{ padding: "8px 0", marginBottom: 16 }}>
        {items.length === 0 ? (
          <div style={{ padding: "32px", color: "var(--muted)", fontSize: 13 }}>Няма артикули в склада.</div>
        ) : (
          <table>
            <thead><tr><th>Артикул</th><th className="num">По система</th><th className="num">Преброено</th><th className="num">Разлика</th></tr></thead>
            <tbody>
              {items.map((i) => {
                const counted = counts[i.id];
                const diff = counted !== undefined && counted !== "" ? Number(counted) - i.quantity : null;
                return (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>({i.unit})</span></td>
                    <td className="num">{i.quantity}</td>
                    <td className="num" style={{ width: 120 }}>
                      <input type="number" step="any" value={counted ?? ""} onChange={(e) => setCounts({ ...counts, [i.id]: e.target.value })}
                        style={{ padding: "5px 8px", fontSize: 13, textAlign: "right", width: 100 }} placeholder="—" />
                    </td>
                    <td className="num" style={{ color: diff == null ? "var(--muted)" : diff === 0 ? "var(--ink-soft)" : diff > 0 ? "var(--emerald-dark)" : "var(--brick)" }}>
                      {diff == null ? "—" : diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass panel" style={{ padding: 16, marginBottom: 16 }}>
        <label>Бележка към ревизията</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="напр. месечна инвентаризация" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Link href="/dashboard/warehouse" className="btn btn-ghost">Отказ</Link>
        <button className="btn btn-primary" onClick={apply} disabled={saving || items.length === 0}>{saving ? "Прилагане…" : "Приложи ревизията"}</button>
      </div>
    </>
  );
}
