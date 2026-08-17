"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { SAMPLE_TYPES } from "@/lib/fashion/qc";
import { ProductionStatusBadge } from "@/components/app/fashion/ProductionStatusBadge";

type Order = { id: string; code: string; status: string; styleCode: string; color: string | null; cut: number; qtyGood: number; qtyDefective: number; qtyReady: number };
type Style = { id: string; code: string; name: string; sizes: string[]; colors: string[] };
type Material = { id: string; name: string; unit: string };
type Sample = { id: string; type: string; quantity: number; color: string | null; size: string | null; date: string; styleCode: string; materialName: string | null; materialQty: number | null };

export function QcOverview({ styles, materials, canManageSamples }: { styles: Style[]; materials: Material[]; canManageSamples: boolean }) {
  const t = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [ro, rs] = await Promise.all([fetch("/api/fashion/qc"), fetch("/api/fashion/samples")]);
    if (ro.ok) setOrders(await ro.json());
    if (rs.ok) setSamples(await rs.json());
  }
  useEffect(() => { load(); }, []);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.qc")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("fashion.qc.overviewIntro")}</p>

      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 16 }}>
        {orders.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.prod.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.prod.code")}</th><th style={th}>{t("fashion.prod.style")}</th><th style={th}>{t("fashion.prod.cut")}</th>
              <th style={th}>{t("fashion.prod.good")}</th><th style={th}>{t("fashion.prod.defective")}</th><th style={th}>{t("fashion.prod.ready")}</th><th style={th}>{t("fashion.styles.status")}</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/production/${o.id}`} style={{ fontWeight: 600 }}>{o.code}</Link></td>
                  <td style={td}>{o.styleCode}{o.color ? ` · ${o.color}` : ""}</td>
                  <td style={td} className="num">{o.cut}</td>
                  <td style={td} className="num">{o.qtyGood || "—"}</td>
                  <td style={td} className="num">{o.qtyDefective || "—"}</td>
                  <td style={td} className="num">{o.qtyReady || "—"}</td>
                  <td style={td}><ProductionStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("fashion.qc.samples")}</h3>
          {canManageSamples && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.qc.addSample")}</button>}
        </div>
        {samples.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("fashion.qc.noSamples")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.qc.sampleType")}</th><th style={th}>{t("fashion.prod.style")}</th><th style={th}>{t("fashion.qc.qty")}</th>
              <th style={th}>{t("fashion.cutting.material")}</th><th style={th}>{t("fashion.prod.date")}</th>
            </tr></thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id}>
                  <td style={td}>{t(`fashion.qc.sample_${s.type}`)}</td>
                  <td style={td}>{s.styleCode}{s.color ? ` · ${s.color}` : ""}{s.size ? ` · ${s.size}` : ""}</td>
                  <td style={td} className="num">{s.quantity}</td>
                  <td style={td}>{s.materialName ? `${s.materialName} (${s.materialQty})` : "—"}</td>
                  <td style={td}>{dt(s.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewSample styles={styles} materials={materials} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function NewSample({ styles, materials, onClose, onSaved }: { styles: Style[]; materials: Material[]; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState({ styleId: "", type: "first_sample", color: "", size: "", quantity: "1", materialId: "", materialQty: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const style = styles.find((s) => s.id === f.styleId);
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  async function save() {
    if (!f.styleId) { setErr(t("fashion.qc.errSample")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/fashion/samples", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId: f.styleId, type: f.type, color: f.color || null, size: f.size || null, quantity: Number(f.quantity) || 1, materialId: f.materialId || null, materialQty: f.materialQty ? Number(f.materialQty) : null }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(j.insufficient ? t("fashion.qc.sampleInsufficient") : (j.error ?? t("fashion.settings.errSave")));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 520, width: "100%" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.qc.addSample")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("fashion.prod.style")} *</label>
            <select style={inp} value={f.styleId} onChange={(e) => setF({ ...f, styleId: e.target.value })}>
              <option value="">—</option>{styles.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.qc.sampleType")}</label>
            <select style={inp} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{t(`fashion.qc.sample_${s}`)}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.qc.qty")}</label><input type="number" style={inp} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.prod.color")}</label>
            <select style={inp} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })}><option value="">—</option>{(style?.colors ?? []).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>{t("fashion.qc.size")}</label>
            <select style={inp} value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })}><option value="">—</option>{(style?.sizes ?? []).map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>{t("fashion.cutting.material")}</label>
            <select style={inp} value={f.materialId} onChange={(e) => setF({ ...f, materialId: e.target.value })}><option value="">—</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></div>
          <div><label style={lbl}>{t("fashion.qc.materialQty")}</label><input type="number" step="0.001" style={inp} value={f.materialQty} onChange={(e) => setF({ ...f, materialQty: e.target.value })} /></div>
        </div>
        <p style={{ fontSize: 10.5, color: "var(--muted)", margin: "10px 0" }}>{t("fashion.qc.sampleHint")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.qc.saveSample")}</button>
        </div>
      </div>
    </div>
  );
}
