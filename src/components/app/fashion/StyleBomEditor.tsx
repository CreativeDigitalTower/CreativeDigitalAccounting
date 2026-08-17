"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Mat = { id: string; name: string; unit: string; avgCost: number };
type RawOverride = { id: string; size: string; color: string; quantity: number };
type Line = {
  id: string; materialId: string; materialName: string; baseQuantity: number; unit: string; unitCost: number;
  currency: string; resolvedQuantity: number; lineCost: number; rawOverrides: RawOverride[];
};
type Data = { style: { id: string; code: string; name: string; colors: string[]; sizes: string[] }; size: string | null; color: string | null; lines: Line[]; materialCost: number };

export function StyleBomEditor({ styleId, materials, canManage }: { styleId: string; materials: Mat[]; canManage: boolean }) {
  const t = useT();
  const [data, setData] = useState<Data | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [add, setAdd] = useState({ materialId: "", quantity: "" });

  const load = useCallback(async () => {
    const p = new URLSearchParams({ styleId });
    if (size) p.set("size", size);
    if (color) p.set("color", color);
    const r = await fetch(`/api/fashion/bom?${p}`);
    if (r.ok) setData(await r.json());
  }, [styleId, size, color]);
  useEffect(() => { load(); }, [load]);
  if (!data) return null;

  async function addLine() {
    if (!add.materialId || !(Number(add.quantity) > 0)) { setMsg(`⚠️ ${t("fashion.bom.errLine")}`); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/fashion/bom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ styleId, materialId: add.materialId, quantity: Number(add.quantity) }) });
    setBusy(false);
    if (r.ok) { setAdd({ materialId: "", quantity: "" }); load(); } else setMsg(`⚠️ ${(await r.json().catch(() => ({}))).error ?? ""}`);
  }
  async function editQty(id: string, quantity: number) { setBusy(true); await fetch(`/api/fashion/bom/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) }); setBusy(false); load(); }
  async function del(id: string) { setBusy(true); await fetch(`/api/fashion/bom/${id}`, { method: "DELETE" }); setBusy(false); load(); }
  async function setOverride(id: string) {
    if (!size && !color) { setMsg(`⚠️ ${t("fashion.bom.pickVariant")}`); return; }
    const cur = data!.lines.find((l) => l.id === id);
    const q = prompt(t("fashion.bom.overridePrompt", { size: size || "—", color: color || "—" }), String(cur?.resolvedQuantity ?? ""));
    if (q == null || !(Number(q) > 0)) return;
    setBusy(true);
    await fetch(`/api/fashion/bom/${id}/overrides`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: size || null, color: color || null, quantity: Number(q) }) });
    setBusy(false); load();
  }
  async function delOverride(itemId: string, overrideId: string) { setBusy(true); await fetch(`/api/fashion/bom/${itemId}/overrides?overrideId=${overrideId}`, { method: "DELETE" }); setBusy(false); load(); }

  const variant = size || color;
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`${FASHION_BASE_PATH}/styles/${styleId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {data.style.code}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.bom")}</h1>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div className="glass panel" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 12.5 }}>{t("fashion.bom.variant")}:</div>
        <select style={inp} value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">{t("fashion.bom.baseSize")}</option>
          {data.style.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={inp} value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">{t("fashion.bom.anyColor")}</option>
          {data.style.colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 14 }}>
          {t("fashion.bom.materialCost")}: <strong className="num">{data.materialCost.toFixed(4)} €</strong>
          {variant && <span style={{ fontSize: 11.5, color: "var(--muted)" }}> · {[size, color].filter(Boolean).join(" / ")}</span>}
        </div>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {data.lines.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t("fashion.bom.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead><tr>
              <th style={th}>{t("fashion.bom.material")}</th><th style={th}>{t("fashion.bom.baseQty")}</th><th style={th}>{t("fashion.bom.resolvedQty")}</th>
              <th style={th}>{t("fashion.bom.unitCost")}</th><th style={th}>{t("fashion.bom.lineCost")}</th><th style={th}>{t("fashion.bom.overrides")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.id}>
                  <td style={td}>{l.materialName}</td>
                  <td style={td} className="num">
                    {canManage
                      ? <><input type="number" step="0.001" defaultValue={l.baseQuantity} style={{ ...inp, width: 80 }} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== l.baseQuantity) editQty(l.id, v); }} /> {l.unit}</>
                      : `${l.baseQuantity} ${l.unit}`}
                  </td>
                  <td style={td} className="num"><strong>{l.resolvedQuantity}</strong> {l.unit}</td>
                  <td style={td} className="num">{l.unitCost.toFixed(4)}</td>
                  <td style={td} className="num">{l.lineCost.toFixed(4)}</td>
                  <td style={td}>
                    {l.rawOverrides.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 11.5 }}>—</span> : l.rawOverrides.map((o) => (
                      <span key={o.id} style={{ fontSize: 10.5, background: "rgba(0,0,0,.05)", borderRadius: 8, padding: "1px 6px", marginRight: 4, whiteSpace: "nowrap" }}>
                        {[o.size, o.color].filter(Boolean).join("/")}: {o.quantity}
                        {canManage && <button onClick={() => delOverride(l.id, o.id)} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--brick)", marginLeft: 3 }}>✕</button>}
                      </span>
                    ))}
                  </td>
                  {canManage && (
                    <td style={td}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} disabled={busy} onClick={() => setOverride(l.id)}>{t("fashion.bom.override")}</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px", marginLeft: 4, color: "var(--brick)" }} disabled={busy} onClick={() => del(l.id)}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canManage && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ fontSize: 12.5 }}>{t("fashion.bom.addLine")}:</strong>
            <select style={{ ...inp, minWidth: 200 }} value={add.materialId} onChange={(e) => setAdd({ ...add, materialId: e.target.value })}>
              <option value="">— {t("fashion.bom.material")} —</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <input type="number" step="0.001" style={{ ...inp, width: 100 }} placeholder={t("fashion.bom.baseQty")} value={add.quantity} onChange={(e) => setAdd({ ...add, quantity: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={addLine}>{t("fashion.bom.add")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
