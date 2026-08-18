"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Row = { id: string; sku: string; styleCode: string; available: number; minStock: number; avgMonthly: number; coverDays: number | null; suggested: number };

export function ForecastPanel({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [win, setWin] = useState(3);
  const [target, setTarget] = useState(2);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/fashion/forecast?window=${win}&target=${target}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows); }
  }, [win, target]);
  useEffect(() => { load(); }, [load]);

  async function setMin(id: string, minStock: number) {
    setBusy(true);
    await fetch(`/api/fashion/finished-goods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minStock }) });
    setBusy(false); load();
  }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "4px 6px", fontSize: 12, width: 60 } as const;

  return (
    <div className="glass panel" style={{ overflowX: "auto", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("fashion.fc.title")}</h3>
        <label style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: "auto" }}>{t("fashion.fc.window")}
          <select value={win} onChange={(e) => setWin(Number(e.target.value))} style={{ marginLeft: 4, padding: "3px 6px", fontSize: 12 }}>{[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("fashion.fc.target")}
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ marginLeft: 4, padding: "3px 6px", fontSize: 12 }}>{[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>{t("fashion.fc.hint")}</p>
      {rows.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.an.noData")}</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>SKU</th><th style={th}>{t("fashion.fg.available")}</th><th style={th}>{t("fashion.fc.avgMonthly")}</th>
            <th style={th}>{t("fashion.fc.coverDays")}</th><th style={th}>{t("fashion.fc.minStock")}</th><th style={th}>{t("fashion.fc.suggested")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td} className="num">{r.sku}</td>
                <td style={td} className="num">{r.available}</td>
                <td style={td} className="num">{r.avgMonthly}</td>
                <td style={td} className="num">{r.coverDays == null ? "—" : `${r.coverDays} ${t("fashion.fc.days")}`}</td>
                <td style={td} className="num">
                  {canManage ? <input type="number" defaultValue={r.minStock} style={inp} disabled={busy} onBlur={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= 0 && v !== r.minStock) setMin(r.id, v); }} /> : r.minStock}
                </td>
                <td style={td} className="num">{r.suggested > 0 ? <strong style={{ color: "var(--brick)" }}>{r.suggested}</strong> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
