"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Material = {
  id: string; name: string; sku: string | null; unit: string; quantity: number; minQuantity: number | null;
  avgCost: number; currency: string; totalValue: number; colorName: string | null; supplierName: string | null;
  brand: string | null; composition: string | null; widthCm: number | null; weightGsm: number | null; note: string | null;
};
type Movement = { id: string; type: string; direction: string; quantity: number; unit: string; unitCost: number | null; note: string | null; date: string };

export function MaterialDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const [m, setM] = useState<Material | null>(null);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [adj, setAdj] = useState({ type: "MANUAL_IN", quantity: "", unitCost: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [rm, rmv] = await Promise.all([fetch(`/api/fashion/materials/${id}`), fetch(`/api/fashion/materials/${id}/movements`)]);
    if (rm.ok) setM(await rm.json());
    if (rmv.ok) setMoves(await rmv.json());
  }
  useEffect(() => { load(); }, [id]);
  if (!m) return null;

  async function submitAdj() {
    if (!(Number(adj.quantity) > 0)) { setMsg(`⚠️ ${t("fashion.materials.errQty")}`); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`/api/fashion/materials/${id}/movements`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: adj.type, quantity: Number(adj.quantity), unitCost: adj.unitCost ? Number(adj.unitCost) : null, note: adj.note || null }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setAdj({ type: "MANUAL_IN", quantity: "", unitCost: "", note: "" }); setMsg(`✅ ${t("fashion.materials.adjDone")}`); load(); }
    else setMsg(`⚠️ ${j.insufficient ? t("fashion.materials.insufficient") : (j.error ?? t("fashion.settings.errSave"))}`);
  }

  const dt = (x: string) => new Date(x).toLocaleString();
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/materials`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.nav.materials")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{m.name}</h1>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.info")}</h3>
          <Row l={t("fashion.materials.sku")} v={m.sku} />
          <Row l={t("fashion.materials.color")} v={m.colorName} />
          <Row l={t("fashion.materials.brand")} v={m.brand} />
          <Row l={t("fashion.materials.supplier")} v={m.supplierName} />
          <Row l={t("fashion.materials.qty")} v={`${m.quantity} ${m.unit}`} />
          <Row l={t("fashion.materials.avgCost")} v={`${m.avgCost.toFixed(4)} ${m.currency}`} />
          <Row l={t("fashion.materials.value")} v={`${m.totalValue.toFixed(2)} ${m.currency}`} />
          <Row l={t("fashion.materials.minQty")} v={m.minQuantity} />
          {m.composition && <Row l={t("fashion.materials.composition")} v={m.composition} />}
          {m.widthCm != null && <Row l={t("fashion.materials.width")} v={`${m.widthCm} cm`} />}
          {m.weightGsm != null && <Row l={t("fashion.materials.gsm")} v={`${m.weightGsm} g/m²`} />}
        </div>

        {canManage && (
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.adjust")}</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <div><label style={lbl}>{t("fashion.materials.adjType")}</label>
                <select style={inp} value={adj.type} onChange={(e) => setAdj({ ...adj, type: e.target.value })}>
                  <option value="MANUAL_IN">{t("fashion.mv.MANUAL_IN")}</option>
                  <option value="MANUAL_OUT">{t("fashion.mv.MANUAL_OUT")}</option>
                </select></div>
              <div><label style={lbl}>{t("fashion.materials.qty")}</label><input type="number" step="0.001" style={inp} value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} /></div>
              {adj.type === "MANUAL_IN" && <div><label style={lbl}>{t("fashion.materials.unitCost")}</label><input type="number" step="0.0001" style={inp} value={adj.unitCost} onChange={(e) => setAdj({ ...adj, unitCost: e.target.value })} /></div>}
              <div><label style={lbl}>{t("fashion.materials.note")}</label><input style={inp} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></div>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={submitAdj}>{t("fashion.materials.applyAdj")}</button>
            </div>
          </div>
        )}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.ledger")}</h3>
        {moves.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.materials.noMoves")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.materials.date")}</th><th style={th}>{t("fashion.materials.type")}</th><th style={th}>{t("fashion.materials.dir")}</th>
              <th style={th}>{t("fashion.materials.qty")}</th><th style={th}>{t("fashion.materials.unitCost")}</th><th style={th}>{t("fashion.materials.note")}</th>
            </tr></thead>
            <tbody>
              {moves.map((mv) => (
                <tr key={mv.id}>
                  <td style={td}>{dt(mv.date)}</td>
                  <td style={td}>{t(`fashion.mv.${mv.type}`)}</td>
                  <td style={td}><span style={{ color: mv.direction === "in" ? "var(--emerald-dark,#0F8A6A)" : "var(--brick)", fontWeight: 700 }}>{mv.direction === "in" ? "+" : "−"}</span></td>
                  <td style={td} className="num">{mv.quantity} {mv.unit}</td>
                  <td style={td} className="num">{mv.unitCost != null ? mv.unitCost.toFixed(4) : "—"}</td>
                  <td style={td}>{mv.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
