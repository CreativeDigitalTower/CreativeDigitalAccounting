"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Line = { id: string; size: string; quantity: number };
type Remnant = { id: string; widthCm: number | null; lengthCm: number | null; quantity: number; status: string; note: string | null };
type Batch = {
  id: string; code: string; status: string; color: string | null; roll: string | null; batch: string | null; date: string;
  expectedFabric: number; actualFabric: number; waste: number; totalUnits: number;
  variance: { diff: number; pct: number };
  style: { code: string; name: string }; material: { name: string; unit: string; quantity: number };
  lines: Line[]; remnants: Remnant[];
};

export function CuttingDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const [b, setB] = useState<Batch | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [actual, setActual] = useState("");
  const [waste, setWaste] = useState("");
  const [rem, setRem] = useState({ widthCm: "", lengthCm: "", quantity: "1" });

  async function load() { const r = await fetch(`/api/fashion/cutting/${id}`); if (r.ok) { const j = await r.json(); setB(j); setActual(String(j.actualFabric || "")); setWaste(String(j.waste || "")); } }
  useEffect(() => { load(); }, [id]);
  if (!b) return null;
  const draft = b.status === "draft";

  async function saveDraft() { setBusy(true); await fetch(`/api/fashion/cutting/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actualFabric: Number(actual) || 0, waste: Number(waste) || 0 }) }); setBusy(false); load(); }
  async function confirm() {
    if (!(Number(actual) > 0)) { setMsg(`⚠️ ${t("fashion.cutting.errActual")}`); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`/api/fashion/cutting/${id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actualFabric: Number(actual), waste: Number(waste) || 0 }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setMsg(`✅ ${t("fashion.cutting.confirmed")}`); load(); }
    else setMsg(`⚠️ ${j.insufficient ? t("fashion.cutting.insufficient") : (j.error ?? t("fashion.settings.errSave"))}`);
  }
  async function addRemnant() {
    setBusy(true);
    await fetch(`/api/fashion/cutting/${id}/remnants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widthCm: rem.widthCm ? Number(rem.widthCm) : null, lengthCm: rem.lengthCm ? Number(rem.lengthCm) : null, quantity: Number(rem.quantity) || 1 }) });
    setBusy(false); setRem({ widthCm: "", lengthCm: "", quantity: "1" }); load();
  }
  async function setRemStatus(remnantId: string, status: string) { setBusy(true); await fetch(`/api/fashion/cutting/${id}/remnants?remnantId=${remnantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); setBusy(false); load(); }

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/cutting`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.nav.cutting")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }} className="num">{b.code}</h1>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", borderRadius: 10, padding: "2px 8px", background: b.status === "confirmed" ? "var(--emerald-dark,#0F8A6A)" : b.status === "cancelled" ? "var(--muted)" : "#C08A2D" }}>{t(`fashion.cutting.st_${b.status}`)}</span>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.materials.info")}</h3>
          <Row l={t("fashion.cutting.style")} v={`${b.style.code} · ${b.style.name}`} />
          <Row l={t("fashion.cutting.color")} v={b.color} />
          <Row l={t("fashion.cutting.material")} v={`${b.material.name} (${t("fashion.cutting.inStock")}: ${b.material.quantity} ${b.material.unit})`} />
          <Row l={t("fashion.cutting.roll")} v={[b.roll, b.batch].filter(Boolean).join(" / ")} />
          <Row l={t("fashion.cutting.date")} v={dt(b.date)} />
          <Row l={t("fashion.cutting.units")} v={b.totalUnits} />
        </div>

        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.cutting.fabric")}</h3>
          <Row l={t("fashion.cutting.expected")} v={`${b.expectedFabric} ${b.material.unit}`} />
          {draft && canManage ? (
            <>
              <div style={{ margin: "6px 0" }}><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("fashion.cutting.actual")}</label><input type="number" step="0.001" style={{ ...inp, width: "100%" }} value={actual} onChange={(e) => setActual(e.target.value)} onBlur={saveDraft} /></div>
              <div style={{ margin: "6px 0" }}><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("fashion.cutting.waste")}</label><input type="number" step="0.001" style={{ ...inp, width: "100%" }} value={waste} onChange={(e) => setWaste(e.target.value)} onBlur={saveDraft} /></div>
            </>
          ) : (
            <>
              <Row l={t("fashion.cutting.actual")} v={`${b.actualFabric} ${b.material.unit}`} />
              <Row l={t("fashion.cutting.waste")} v={`${b.waste} ${b.material.unit}`} />
            </>
          )}
          <Row l={t("fashion.cutting.variance")} v={<span style={{ color: b.variance.diff > 0 ? "var(--brick)" : "var(--emerald-dark,#0F8A6A)" }}>{b.variance.diff > 0 ? "+" : ""}{b.variance.diff} {b.material.unit} ({b.variance.pct > 0 ? "+" : ""}{b.variance.pct}%)</span>} />
          {draft && canManage && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} disabled={busy} onClick={confirm}>{t("fashion.cutting.confirm")}</button>
          )}
          {draft && <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6 }}>{t("fashion.cutting.confirmHint")}</p>}
        </div>
      </div>

      <div className="glass panel" style={{ marginBottom: 14, overflowX: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.cutting.quantities")}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {b.lines.map((l) => <span key={l.id} style={{ fontSize: 12.5, background: "rgba(0,0,0,.05)", borderRadius: 10, padding: "3px 12px" }}><strong>{l.size}</strong>: {l.quantity}</span>)}
        </div>
      </div>

      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("fashion.cutting.remnants")}</h3>
        {b.remnants.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.cutting.noRemnants")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <tbody>
              {b.remnants.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num">{[r.widthCm, r.lengthCm].filter((x) => x != null).join(" × ") || "—"} {r.widthCm ? "m" : ""}</td>
                  <td style={td} className="num">{r.quantity} {t("fashion.cutting.pieces")}</td>
                  <td style={td}>{t(`fashion.cutting.rem_${r.status}`)}</td>
                  <td style={td}>
                    {canManage && ["available", "reserved", "used", "waste"].filter((s) => s !== r.status).map((s) => (
                      <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "1px 6px", marginRight: 3 }} disabled={busy} onClick={() => setRemStatus(r.id, s)}>{t(`fashion.cutting.rem_${s}`)}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <input type="number" step="0.01" style={{ ...inp, width: 90 }} placeholder={t("fashion.cutting.width")} value={rem.widthCm} onChange={(e) => setRem({ ...rem, widthCm: e.target.value })} />
            <input type="number" step="0.01" style={{ ...inp, width: 90 }} placeholder={t("fashion.cutting.length")} value={rem.lengthCm} onChange={(e) => setRem({ ...rem, lengthCm: e.target.value })} />
            <input type="number" style={{ ...inp, width: 70 }} placeholder={t("fashion.cutting.pieces")} value={rem.quantity} onChange={(e) => setRem({ ...rem, quantity: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addRemnant}>{t("fashion.cutting.addRemnant")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
