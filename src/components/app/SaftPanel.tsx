"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

const TYPE_IDS = ["monthly", "annual", "on_demand"] as const;

export function SaftPanel({ ready }: { ready: boolean }) {
  const { t, locale } = useI18n();
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
      if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? t("modules.saft.panel.errGen")); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m ? m[1] : `SAF-T_${year}.xml`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch { setErr(t("modules.saft.panel.errNet")); }
    finally { setBusy(false); }
  }

  return (
    <div className="glass panel" style={{ padding: "22px 24px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{t("modules.saft.panel.title")}</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 18px" }}>{t("modules.saft.panel.subtitle")}</p>

      {/* Вид на файла */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
        {TYPE_IDS.map((id) => (
          <button key={id} type="button" onClick={() => setType(id)}
            style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              background: type === id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: type === id ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t(`modules.saft.panel.types.${id}.label`)}{type === id && <span style={{ color: "var(--emerald)", marginLeft: 6 }}>✓</span>}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{t(`modules.saft.panel.types.${id}.desc`)}</div>
          </button>
        ))}
      </div>

      {/* Период */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <label>{t("modules.saft.panel.year")}</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ minWidth: 120 }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {type === "monthly" && (
          <div>
            <label>{t("modules.saft.panel.month")}</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ minWidth: 150 }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" })}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-primary" onClick={generate} disabled={!ready || busy}>{busy ? t("modules.saft.panel.generating") : t("modules.saft.panel.generate")}</button>
      </div>

      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>{err}</div>}
      {!ready && <div style={{ background: "var(--brass-soft)", color: "var(--brass)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5 }}>{t("modules.saft.panel.notReady")}</div>}
    </div>
  );
}
