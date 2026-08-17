"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { StatusBadge } from "@/components/app/fashion/StatusBadge";

type Row = { id: string; code: string; name: string; status: string; opCount: number; totalMinutes: number };
type Machine = { id: string; name: string; type: string | null };

export function OperationsOverview({ canManageMachines }: { canManageMachines: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [nm, setNm] = useState({ name: "", type: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [r, rm] = await Promise.all([fetch("/api/fashion/operations"), fetch("/api/fashion/machines")]);
    if (r.ok) setRows(await r.json());
    if (rm.ok) setMachines(await rm.json());
  }
  useEffect(() => { load(); }, []);

  async function addMachine() {
    if (!nm.name.trim()) return;
    setBusy(true);
    const r = await fetch("/api/fashion/machines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nm.name, type: nm.type || null }) });
    setBusy(false);
    if (r.ok) { setNm({ name: "", type: "" }); load(); }
  }

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "6px 9px", fontSize: 12.5 } as const;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.operations")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("fashion.ops.overviewIntro")}</p>

      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 14 }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.styles.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.styles.code")}</th><th style={th}>{t("fashion.styles.name")}</th><th style={th}>{t("fashion.styles.status")}</th>
              <th style={th}>{t("fashion.ops.count")}</th><th style={th}>{t("fashion.ops.total")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/styles/${r.id}/operations`} style={{ fontWeight: 600 }}>{r.code}</Link></td>
                  <td style={td}>{r.name}</td>
                  <td style={td}><StatusBadge status={r.status} /></td>
                  <td style={td} className="num">{r.opCount}</td>
                  <td style={td} className="num">{r.totalMinutes} {t("fashion.ops.min")}</td>
                  <td style={td}><Link href={`${FASHION_BASE_PATH}/styles/${r.id}/operations`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("fashion.bom.edit")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.ops.machines")}</h3>
        {machines.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.ops.noMachines")}</div> : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {machines.map((m) => <span key={m.id} style={{ fontSize: 12, background: "rgba(0,0,0,.05)", borderRadius: 10, padding: "3px 10px" }}>{m.name}{m.type ? <span style={{ color: "var(--muted)" }}> · {m.type}</span> : null}</span>)}
          </div>
        )}
        {canManageMachines && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inp, minWidth: 160 }} placeholder={t("fashion.ops.machineName")} value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
            <input style={{ ...inp, width: 130 }} placeholder={t("fashion.ops.machineType")} value={nm.type} onChange={(e) => setNm({ ...nm, type: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addMachine}>{t("fashion.ops.addMachine")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
