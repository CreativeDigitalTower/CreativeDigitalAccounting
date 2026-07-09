"use client";

import { useState } from "react";

const MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
const TYPES: { id: "monthly" | "annual" | "on_demand"; label: string; desc: string }[] = [
  { id: "monthly", label: "Месечен", desc: "Счетоводни данни и документи за избран месец" },
  { id: "annual", label: "Годишен", desc: "Годишни данни, включително дълготрайни активи" },
  { id: "on_demand", label: "При поискване", desc: "Наличности и активи — снимка към момента" },
];

export function SaftPanel({ ready }: { ready: boolean }) {
  const now = new Date();
  const [type, setType] = useState<"monthly" | "annual" | "on_demand">("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  async function generate() {
    if (!ready || busy) return;
    setBusy(true); setErr("");
    try {
      const params = new URLSearchParams({ year: String(year), type });
      if (type === "monthly") params.set("month", String(month));
      const res = await fetch(`/api/saft?${params.toString()}`);
      if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? "Грешка при генериране."); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m ? m[1] : `SAF-T_${year}.xml`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch { setErr("Няма връзка със сървъра."); }
    finally { setBusy(false); }
  }

  return (
    <div className="glass panel" style={{ padding: "22px 24px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Генериране на SAF-T файл</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 18px" }}>Изберете вид и период. Файлът се сваля във формат XML, готов за подаване към НАП.</p>

      {/* Вид на файла */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => setType(t.id)}
            style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              background: type === t.id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: type === t.id ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}{type === t.id && <span style={{ color: "var(--emerald)", marginLeft: 6 }}>✓</span>}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Период */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <label>Година</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ minWidth: 120 }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {type === "monthly" && (
          <div>
            <label>Месец</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ minWidth: 150 }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-primary" onClick={generate} disabled={!ready || busy}>{busy ? "Генериране…" : "↓ Генерирай и свали SAF-T"}</button>
      </div>

      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>{err}</div>}
      {!ready && <div style={{ background: "var(--brass-soft)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>Попълнете липсващите данни на фирмата по-горе, за да генерирате валиден SAF-T файл.</div>}
    </div>
  );
}
