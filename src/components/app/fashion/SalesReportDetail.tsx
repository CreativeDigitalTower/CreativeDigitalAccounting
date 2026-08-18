"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Line = { id: string; quantity: number; price: number; discount: number; revenue: number; cogs: number; finishedGood: { sku: string; available: number; unitCost: number; style: { code: string } } };
type Report = { id: string; period: string; status: string; revenue: number; cogs: number; grossProfit: number; units: number; grossMarginPct: number; lines: Line[]; finalizedAt: string | null };
type Fg = { id: string; sku: string; available: number; styleCode: string; color: string; size: string };

export function SalesReportDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const [r, setR] = useState<Report | null>(null);
  const [fgs, setFgs] = useState<Fg[]>([]);
  const [add, setAdd] = useState({ finishedGoodId: "", quantity: "", price: "", discount: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [rr, rf] = await Promise.all([fetch(`/api/fashion/sales/${id}`), fetch("/api/fashion/finished-goods")]);
    if (rr.ok) setR(await rr.json());
    if (rf.ok) { const j = await rf.json(); setFgs(j.rows); }
  }
  useEffect(() => { load(); }, [id]);
  if (!r) return null;
  const draft = r.status === "draft";

  async function addLine() {
    if (!add.finishedGoodId || !(Number(add.quantity) > 0) || add.price === "") { setMsg(`⚠️ ${t("fashion.sales.errLine")}`); return; }
    setBusy(true); setMsg("");
    const res = await fetch(`/api/fashion/sales/${id}/lines`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finishedGoodId: add.finishedGoodId, quantity: Number(add.quantity), price: Number(add.price), discount: Number(add.discount) || 0 }) });
    setBusy(false);
    if (res.ok) { setAdd({ finishedGoodId: "", quantity: "", price: "", discount: "" }); load(); } else setMsg(`⚠️ ${(await res.json().catch(() => ({}))).error ?? ""}`);
  }
  async function delLine(lineId: string) { setBusy(true); await fetch(`/api/fashion/sales/${id}/lines?lineId=${lineId}`, { method: "DELETE" }); setBusy(false); load(); }
  async function finalize() {
    if (!confirm(t("fashion.sales.confirmFinalize"))) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/fashion/sales/${id}/finalize`, { method: "POST" });
    const j = await res.json().catch(() => ({})); setBusy(false);
    if (res.ok) { setMsg(`✅ ${t("fashion.sales.finalized")}`); load(); } else setMsg(`⚠️ ${j.insufficient ? t("fashion.sales.insufficient") : (j.error ?? "")}`);
  }
  async function unlock() {
    if (!confirm(t("fashion.sales.confirmUnlock"))) return;
    setBusy(true); await fetch(`/api/fashion/sales/${id}/unlock`, { method: "POST" }); setBusy(false); load();
  }

  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;
  const draftRevenue = r.lines.reduce((s, l) => s + Math.max(0, l.quantity * l.price - l.discount), 0);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/sales`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.nav.sales")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }} className="num">{r.period}</h1>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", borderRadius: 10, padding: "2px 8px", background: draft ? "#C08A2D" : "var(--emerald-dark,#0F8A6A)" }}>{t(`fashion.sales.st_${r.status}`)}</span>
        {canManage && draft && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={busy || r.lines.length === 0} onClick={finalize}>{t("fashion.sales.finalize")}</button>}
        {canManage && !draft && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={unlock}>{t("fashion.sales.unlock")}</button>}
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}
      {!draft && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("fashion.sales.lockedHint")}</div>}

      {!draft && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          {[["revenue", r.revenue], ["cogs", r.cogs], ["grossProfit", r.grossProfit], ["margin", r.grossMarginPct]].map(([k, v]) => (
            <div key={k as string} className="glass panel" style={{ textAlign: "center", padding: "12px 8px" }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{k === "margin" ? `${v}%` : `${(v as number).toFixed(2)} €`}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t(`fashion.sales.${k}`)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {r.lines.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.sales.noLines")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead><tr>
              <th style={th}>SKU</th><th style={th}>{t("fashion.sales.qty")}</th><th style={th}>{t("fashion.sales.price")}</th>
              <th style={th}>{t("fashion.sales.discount")}</th><th style={th}>{t("fashion.sales.lineRevenue")}</th>{draft && canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.id}>
                  <td style={td} className="num">{l.finishedGood.sku}</td>
                  <td style={td} className="num">{l.quantity}</td>
                  <td style={td} className="num">{l.price.toFixed(2)}</td>
                  <td style={td} className="num">{l.discount ? l.discount.toFixed(2) : "—"}</td>
                  <td style={td} className="num">{(l.revenue || Math.max(0, l.quantity * l.price - l.discount)).toFixed(2)} €</td>
                  {draft && canManage && <td style={td}><button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px", color: "var(--brick)" }} disabled={busy} onClick={() => delLine(l.id)}>✕</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {draft && canManage && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <select style={{ ...inp, minWidth: 200 }} value={add.finishedGoodId} onChange={(e) => setAdd({ ...add, finishedGoodId: e.target.value })}>
              <option value="">— SKU —</option>
              {fgs.map((f) => <option key={f.id} value={f.id}>{f.sku} ({t("fashion.fg.available")}: {f.available})</option>)}
            </select>
            <input type="number" style={{ ...inp, width: 70 }} placeholder={t("fashion.sales.qty")} value={add.quantity} onChange={(e) => setAdd({ ...add, quantity: e.target.value })} />
            <input type="number" step="0.01" style={{ ...inp, width: 90 }} placeholder={t("fashion.sales.price")} value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value })} />
            <input type="number" step="0.01" style={{ ...inp, width: 90 }} placeholder={t("fashion.sales.discount")} value={add.discount} onChange={(e) => setAdd({ ...add, discount: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addLine}>{t("fashion.sales.addLine")}</button>
            <span style={{ marginLeft: "auto", fontSize: 12.5 }}>{t("fashion.sales.revenue")}: <strong className="num">{draftRevenue.toFixed(2)} €</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
