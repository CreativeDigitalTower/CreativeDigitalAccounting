"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Opt = { id: string; name: string };
type Op = {
  id: string; seq: number; name: string; categoryId: string | null; categoryLabel: string | null;
  machineId: string | null; machineLabel: string | null; expectedMinutes: number; workstation: string | null;
};
type Data = {
  style: { id: string; code: string; name: string };
  operations: Op[]; totalMinutes: number; totalHours: number;
  byCategory: { key: string; minutes: number; count: number }[];
  byMachine: { key: string; minutes: number; count: number }[];
};

export function StyleOperationsEditor({ styleId, categories, machines, canManage }: { styleId: string; categories: Opt[]; machines: Opt[]; canManage: boolean }) {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ name: "", categoryId: "", machineId: "", expectedMinutes: "", workstation: "" });

  const load = useCallback(async () => { const r = await fetch(`/api/fashion/operations?styleId=${styleId}`); if (r.ok) setData(await r.json()); }, [styleId]);
  useEffect(() => { load(); }, [load]);
  if (!data) return null;

  async function addOp() {
    if (!add.name.trim()) return;
    setBusy(true);
    const r = await fetch("/api/fashion/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ styleId, name: add.name, categoryId: add.categoryId || null, machineId: add.machineId || null, expectedMinutes: Number(add.expectedMinutes) || 0, workstation: add.workstation || null }) });
    setBusy(false);
    if (r.ok) { setAdd({ name: "", categoryId: "", machineId: "", expectedMinutes: "", workstation: "" }); load(); }
  }
  async function patch(id: string, body: Record<string, unknown>) { setBusy(true); await fetch(`/api/fashion/operations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); setBusy(false); load(); }
  async function del(id: string) { setBusy(true); await fetch(`/api/fashion/operations/${id}`, { method: "DELETE" }); setBusy(false); load(); }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/styles/${styleId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {data.style.code}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.operations")}</h1>
        <span style={{ marginLeft: "auto", fontSize: 14 }}>{t("fashion.ops.total")}: <strong className="num">{data.totalMinutes} {t("fashion.ops.min")}</strong> ({data.totalHours} {t("fashion.ops.h")})</span>
      </div>

      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 12 }}>
        {data.operations.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.ops.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead><tr>
              <th style={th}>#</th><th style={th}>{t("fashion.ops.name")}</th><th style={th}>{t("fashion.ops.category")}</th>
              <th style={th}>{t("fashion.ops.machine")}</th><th style={th}>{t("fashion.ops.minutes")}</th><th style={th}>{t("fashion.ops.workstation")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {data.operations.map((o) => (
                <tr key={o.id}>
                  <td style={td} className="num">{o.seq}</td>
                  <td style={td}>{o.name}</td>
                  <td style={td}>{o.categoryLabel ?? "—"}</td>
                  <td style={td}>{o.machineLabel ?? "—"}</td>
                  <td style={td} className="num">
                    {canManage
                      ? <input type="number" step="0.01" defaultValue={o.expectedMinutes} style={{ ...inp, width: 70 }} onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== o.expectedMinutes) patch(o.id, { expectedMinutes: v }); }} />
                      : o.expectedMinutes}
                  </td>
                  <td style={td}>{o.workstation ?? "—"}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px", color: "var(--brick)" }} disabled={busy} onClick={() => del(o.id)}>✕</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inp, minWidth: 160 }} placeholder={t("fashion.ops.name")} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <select style={inp} value={add.categoryId} onChange={(e) => setAdd({ ...add, categoryId: e.target.value })}>
              <option value="">— {t("fashion.ops.category")} —</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={inp} value={add.machineId} onChange={(e) => setAdd({ ...add, machineId: e.target.value })}>
              <option value="">— {t("fashion.ops.machine")} —</option>{machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" step="0.01" style={{ ...inp, width: 80 }} placeholder={t("fashion.ops.minutes")} value={add.expectedMinutes} onChange={(e) => setAdd({ ...add, expectedMinutes: e.target.value })} />
            <input style={{ ...inp, width: 110 }} placeholder={t("fashion.ops.workstation")} value={add.workstation} onChange={(e) => setAdd({ ...add, workstation: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addOp}>{t("fashion.ops.add")}</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.ops.byCategory")}</h3>
          {data.byCategory.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> : data.byCategory.map((c) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}><span>{c.key} <span style={{ color: "var(--muted)" }}>({c.count})</span></span><span className="num">{c.minutes} {t("fashion.ops.min")}</span></div>
          ))}
        </div>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.ops.byMachine")}</h3>
          {data.byMachine.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> : data.byMachine.map((m) => (
            <div key={m.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}><span>{m.key} <span style={{ color: "var(--muted)" }}>({m.count})</span></span><span className="num">{m.minutes} {t("fashion.ops.min")}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
