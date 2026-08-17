"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";
import { ProductionStatusBadge } from "@/components/app/fashion/ProductionStatusBadge";

type Batch = { id: string; code: string; color: string | null; styleCode: string; styleName: string };
type Style = { id: string; code: string; name: string; sizes: string[] };
type Row = {
  id: string; code: string; date: string; status: string; color: string | null; styleCode: string; styleName: string;
  productionBatch: string | null; cut: number; qtyGood: number; qtyDefective: number; qtyRepair: number; qtyReady: number;
};

export function ProductionClient({ batches, styles, canManage }: { batches: Batch[]; styles: Style[]; canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await fetch("/api/fashion/production"); if (r.ok) setRows(await r.json()); }
  useEffect(() => { load(); }, []);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.production")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.prod.add")}</button>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.prod.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.prod.code")}</th><th style={th}>{t("fashion.prod.date")}</th><th style={th}>{t("fashion.prod.style")}</th>
              <th style={th}>{t("fashion.prod.cut")}</th><th style={th}>{t("fashion.prod.ready")}</th><th style={th}>{t("fashion.prod.defective")}</th><th style={th}>{t("fashion.styles.status")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/production/${r.id}`} style={{ fontWeight: 600 }}>{r.code}</Link></td>
                  <td style={td}>{dt(r.date)}</td>
                  <td style={td}>{r.styleCode}{r.color ? ` · ${r.color}` : ""}</td>
                  <td style={td} className="num">{r.cut}</td>
                  <td style={td} className="num">{r.qtyReady || "—"}</td>
                  <td style={td} className="num">{r.qtyDefective || "—"}</td>
                  <td style={td}><ProductionStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewOrder batches={batches} styles={styles} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewOrder({ batches, styles, onClose }: { batches: Batch[]; styles: Style[]; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"batch" | "manual">(batches.length ? "batch" : "manual");
  const [batchId, setBatchId] = useState("");
  const [styleId, setStyleId] = useState("");
  const [color, setColor] = useState("");
  const [pbatch, setPbatch] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const style = styles.find((s) => s.id === styleId);
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  async function save() {
    setBusy(true); setErr("");
    const body = mode === "batch"
      ? { cuttingBatchId: batchId, productionBatch: pbatch || null }
      : { styleId, color: color || null, productionBatch: pbatch || null, lines: Object.entries(qty).map(([size, q]) => ({ size, cutQuantity: Number(q) || 0 })).filter((l) => l.cutQuantity > 0) };
    if (mode === "batch" && !batchId) { setBusy(false); setErr(t("fashion.prod.pickBatch")); return; }
    if (mode === "manual" && (!styleId || !Object.values(qty).some((q) => Number(q) > 0))) { setBusy(false); setErr(t("fashion.prod.errManual")); return; }
    const r = await fetch("/api/fashion/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) router.push(`${FASHION_BASE_PATH}/production/${j.id}`);
    else setErr(j.error ?? t("fashion.settings.errSave"));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.prod.add")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button className={`filter-tab${mode === "batch" ? " active" : ""}`} onClick={() => setMode("batch")}>{t("fashion.prod.fromCutting")}</button>
          <button className={`filter-tab${mode === "manual" ? " active" : ""}`} onClick={() => setMode("manual")}>{t("fashion.prod.manual")}</button>
        </div>

        {mode === "batch" ? (
          <div><label style={lbl}>{t("fashion.prod.cuttingBatch")} *</label>
            <select style={inp} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">—</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.styleCode}{b.color ? ` · ${b.color}` : ""}</option>)}
            </select>
            {batches.length === 0 && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{t("fashion.prod.noBatches")}</div>}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div><label style={lbl}>{t("fashion.prod.style")} *</label>
              <select style={inp} value={styleId} onChange={(e) => { setStyleId(e.target.value); setQty({}); }}>
                <option value="">—</option>{styles.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select></div>
            <div><label style={lbl}>{t("fashion.prod.color")}</label><input style={inp} value={color} onChange={(e) => setColor(e.target.value)} /></div>
            {style && style.sizes.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t("fashion.prod.cutQuantities")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
                  {style.sizes.map((s) => <div key={s}><label style={lbl}>{s}</label><input type="number" style={inp} value={qty[s] ?? ""} onChange={(e) => setQty({ ...qty, [s]: e.target.value })} /></div>)}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 10 }}><label style={lbl}>{t("fashion.prod.productionBatch")}</label><input style={inp} value={pbatch} onChange={(e) => setPbatch(e.target.value)} /></div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.prod.create")}</button>
        </div>
      </div>
    </div>
  );
}
