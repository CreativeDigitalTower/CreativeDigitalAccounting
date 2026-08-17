"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { DEFECT_DISPOSITIONS } from "@/lib/fashion/qc";

type Defect = { id: string; quantity: number; size: string | null; color: string | null; defectType: string; description: string | null; disposition: string };
type QcRecord = { id: string; goodQty: number; note: string | null; createdAt: string };
type Data = { qcRecords: QcRecord[]; defects: Defect[]; cut: number; qtyGood: number; qtyDefective: number; qtyReady: number };
type Cat = { id: string; name: string };

export function ProductionQcPanel({ orderId, canManage, onChange }: { orderId: string; canManage: boolean; onChange: () => void }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [good, setGood] = useState("");
  const [df, setDf] = useState({ quantity: "", defectType: "", size: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [r, rc] = await Promise.all([fetch(`/api/fashion/qc?orderId=${orderId}`), fetch("/api/fashion/defect-categories")]);
    if (r.ok) setD(await r.json());
    if (rc.ok) setCats(await rc.json());
  }, [orderId]);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  async function addGood() {
    if (!(Number(good) >= 0) || good === "") return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/qc/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionOrderId: orderId, goodQty: Number(good) }) });
    setBusy(false);
    if (r.ok) { setGood(""); load(); onChange(); } else setMsg(`⚠️ ${(await r.json().catch(() => ({}))).error ?? ""}`);
  }
  async function addDefect() {
    if (!(Number(df.quantity) > 0) || !df.defectType) { setMsg(`⚠️ ${t("fashion.qc.errDefect")}`); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/qc/defects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionOrderId: orderId, quantity: Number(df.quantity), defectType: df.defectType, size: df.size || null, description: df.description || null }) });
    setBusy(false);
    if (r.ok) { setDf({ quantity: "", defectType: "", size: "", description: "" }); load(); onChange(); } else setMsg(`⚠️ ${(await r.json().catch(() => ({}))).error ?? ""}`);
  }
  async function setDisposition(id: string, disposition: string) {
    setBusy(true);
    await fetch(`/api/fashion/qc/defects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disposition }) });
    setBusy(false); load(); onChange();
  }

  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;

  return (
    <div className="glass panel" style={{ overflowX: "auto" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.qc.title")}</h3>
      {msg && <div style={{ fontSize: 12, marginBottom: 8 }}>{msg}</div>}

      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
        {t("fashion.qc.summary", { good: String(d.qtyGood), defective: String(d.qtyDefective), ready: String(d.qtyReady), cut: String(d.cut) })}
      </div>

      {canManage && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5 }}>{t("fashion.qc.addGood")}:</span>
          <input type="number" style={{ ...inp, width: 90 }} value={good} onChange={(e) => setGood(e.target.value)} placeholder={t("fashion.prod.good")} />
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={addGood}>{t("fashion.qc.record")}</button>
        </div>
      )}

      {d.defects.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead><tr>
            <th style={{ ...td, borderTop: 0, color: "var(--muted)", fontSize: 11.5, textAlign: "left" }}>{t("fashion.qc.qty")}</th>
            <th style={{ ...td, borderTop: 0, color: "var(--muted)", fontSize: 11.5, textAlign: "left" }}>{t("fashion.qc.type")}</th>
            <th style={{ ...td, borderTop: 0, color: "var(--muted)", fontSize: 11.5, textAlign: "left" }}>{t("fashion.qc.size")}</th>
            <th style={{ ...td, borderTop: 0, color: "var(--muted)", fontSize: 11.5, textAlign: "left" }}>{t("fashion.qc.disposition")}</th>
          </tr></thead>
          <tbody>
            {d.defects.map((x) => (
              <tr key={x.id}>
                <td style={td} className="num">{x.quantity}</td>
                <td style={td}>{x.defectType}{x.description ? <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{x.description}</div> : null}</td>
                <td style={td}>{x.size ?? "—"}</td>
                <td style={td}>
                  {canManage
                    ? <select style={inp} value={x.disposition} disabled={busy} onChange={(e) => setDisposition(x.id, e.target.value)}>
                        {DEFECT_DISPOSITIONS.map((s) => <option key={s} value={s}>{t(`fashion.qc.disp_${s}`)}</option>)}
                      </select>
                    : t(`fashion.qc.disp_${x.disposition}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ fontSize: 12.5 }}>{t("fashion.qc.addDefect")}:</strong>
          <input type="number" style={{ ...inp, width: 70 }} placeholder={t("fashion.qc.qty")} value={df.quantity} onChange={(e) => setDf({ ...df, quantity: e.target.value })} />
          <select style={inp} value={df.defectType} onChange={(e) => setDf({ ...df, defectType: e.target.value })}>
            <option value="">— {t("fashion.qc.type")} —</option>{cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input style={{ ...inp, width: 60 }} placeholder={t("fashion.qc.size")} value={df.size} onChange={(e) => setDf({ ...df, size: e.target.value })} />
          <input style={{ ...inp, width: 150 }} placeholder={t("fashion.qc.desc")} value={df.description} onChange={(e) => setDf({ ...df, description: e.target.value })} />
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={addDefect}>{t("fashion.qc.add")}</button>
        </div>
      )}
    </div>
  );
}
