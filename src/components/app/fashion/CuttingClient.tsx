"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type StyleOpt = { id: string; code: string; name: string };
type Row = {
  id: string; code: string; date: string; status: string; color: string | null; styleCode: string; materialName: string;
  unit: string; totalUnits: number; expectedFabric: number; actualFabric: number;
};

export function CuttingClient({ styles, canManage }: { styles: StyleOpt[]; canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await fetch("/api/fashion/cutting"); if (r.ok) setRows(await r.json()); }
  useEffect(() => { load(); }, []);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.cutting")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.cutting.add")}</button>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.cutting.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.cutting.code")}</th><th style={th}>{t("fashion.cutting.date")}</th><th style={th}>{t("fashion.cutting.style")}</th>
              <th style={th}>{t("fashion.cutting.material")}</th><th style={th}>{t("fashion.cutting.units")}</th><th style={th}>{t("fashion.cutting.expected")}</th>
              <th style={th}>{t("fashion.cutting.actual")}</th><th style={th}>{t("fashion.styles.status")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td} className="num"><Link href={`${FASHION_BASE_PATH}/cutting/${r.id}`} style={{ fontWeight: 600 }}>{r.code}</Link></td>
                  <td style={td}>{dt(r.date)}</td>
                  <td style={td}>{r.styleCode}{r.color ? ` · ${r.color}` : ""}</td>
                  <td style={td}>{r.materialName}</td>
                  <td style={td} className="num">{r.totalUnits}</td>
                  <td style={td} className="num">{r.expectedFabric} {r.unit}</td>
                  <td style={td} className="num">{r.actualFabric || "—"} {r.actualFabric ? r.unit : ""}</td>
                  <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", borderRadius: 10, padding: "2px 8px", background: r.status === "confirmed" ? "var(--emerald-dark,#0F8A6A)" : r.status === "cancelled" ? "var(--muted)" : "#C08A2D" }}>{t(`fashion.cutting.st_${r.status}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewCutting styles={styles} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewCutting({ styles, onClose }: { styles: StyleOpt[]; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [styleId, setStyleId] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<{ id: string; name: string }[]>([]);
  const [f, setF] = useState({ materialId: "", color: "", roll: "", batch: "", date: new Date().toISOString().slice(0, 10), actualFabric: "" });
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pickStyle(id: string) {
    setStyleId(id); setSizes([]); setColors([]); setMaterials([]); setQty({});
    if (!id) return;
    const [rs, rb] = await Promise.all([fetch(`/api/fashion/styles/${id}`), fetch(`/api/fashion/bom?styleId=${id}`)]);
    if (rs.ok) { const s = await rs.json(); setSizes(s.sizes ?? []); setColors(s.colors ?? []); }
    if (rb.ok) { const b = await rb.json(); setMaterials((b.lines ?? []).map((l: { materialId: string; materialName: string }) => ({ id: l.materialId, name: l.materialName }))); }
  }

  async function save() {
    const lines = Object.entries(qty).map(([size, q]) => ({ size, quantity: Number(q) || 0 })).filter((l) => l.quantity > 0);
    if (!styleId || !f.materialId || !lines.length) { setErr(t("fashion.cutting.errRequired")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/fashion/cutting", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId, materialId: f.materialId, color: f.color || null, roll: f.roll || null, batch: f.batch || null, date: new Date(f.date).toISOString(), actualFabric: f.actualFabric ? Number(f.actualFabric) : 0, lines }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) router.push(`${FASHION_BASE_PATH}/cutting/${j.id}`);
    else setErr(j.error ?? t("fashion.settings.errSave"));
  }

  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 620, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.cutting.add")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("fashion.cutting.style")} *</label>
            <select style={inp} value={styleId} onChange={(e) => pickStyle(e.target.value)}>
              <option value="">—</option>{styles.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.cutting.material")} *</label>
            <select style={inp} value={f.materialId} onChange={(e) => setF({ ...f, materialId: e.target.value })}>
              <option value="">—</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {styleId && materials.length === 0 && <div style={{ fontSize: 10.5, color: "var(--brick)" }}>{t("fashion.cutting.noBom")}</div>}
          </div>
          <div><label style={lbl}>{t("fashion.cutting.color")}</label>
            <select style={inp} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })}>
              <option value="">—</option>{colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.cutting.roll")}</label><input style={inp} value={f.roll} onChange={(e) => setF({ ...f, roll: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.cutting.batch")}</label><input style={inp} value={f.batch} onChange={(e) => setF({ ...f, batch: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.cutting.date")}</label><input type="date" style={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.cutting.actual")}</label><input type="number" step="0.001" style={inp} value={f.actualFabric} onChange={(e) => setF({ ...f, actualFabric: e.target.value })} /></div>
        </div>

        {sizes.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t("fashion.cutting.quantities")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
              {sizes.map((s) => (
                <div key={s}><label style={lbl}>{s}</label><input type="number" style={inp} value={qty[s] ?? ""} onChange={(e) => setQty({ ...qty, [s]: e.target.value })} /></div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.cutting.create")}</button>
        </div>
      </div>
    </div>
  );
}
