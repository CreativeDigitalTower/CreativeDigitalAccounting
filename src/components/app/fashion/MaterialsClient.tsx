"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Opt = { id: string; name: string };
type Material = {
  id: string; name: string; sku: string | null; categoryName: string | null; supplierName: string | null;
  colorName: string | null; unit: string; quantity: number; minQuantity: number | null; avgCost: number;
  currency: string; totalValue: number; isLow: boolean; active: boolean;
};

export function MaterialsClient({ categories, suppliers, canManage }: { categories: Opt[]; suppliers: Opt[]; canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [low, setLow] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    const p = new URLSearchParams();
    if (cat) p.set("categoryId", cat);
    if (low) p.set("lowStock", "1");
    const r = await fetch(`/api/fashion/materials?${p}`);
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => { load(); }, [cat, low]);

  const filtered = useMemo(() => rows.filter((m) => !q || `${m.name} ${m.sku ?? ""} ${m.colorName ?? ""}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const totalStockValue = useMemo(() => filtered.reduce((s, m) => s + m.totalValue, 0), [filtered]);

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.materials")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.materials.add")}</button>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...sel, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("fashion.materials.search")} />
        <select style={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{t("fashion.materials.allCategories")}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />{t("fashion.materials.lowOnly")}
        </label>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>
          {t("fashion.materials.stockValue")}: <strong className="num">{totalStockValue.toFixed(2)} €</strong>
        </span>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.materials.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.materials.name")}</th><th style={th}>{t("fashion.materials.sku")}</th><th style={th}>{t("fashion.materials.category")}</th>
              <th style={th}>{t("fashion.materials.color")}</th><th style={th}>{t("fashion.materials.qty")}</th><th style={th}>{t("fashion.materials.avgCost")}</th>
              <th style={th}>{t("fashion.materials.value")}</th><th style={th}>{t("fashion.materials.supplier")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ opacity: m.active ? 1 : 0.5 }}>
                  <td style={td}><Link href={`${FASHION_BASE_PATH}/materials/${m.id}`} style={{ fontWeight: 600 }}>{m.name}</Link></td>
                  <td style={td} className="num">{m.sku ?? "—"}</td>
                  <td style={td}>{m.categoryName ?? "—"}</td>
                  <td style={td}>{m.colorName ?? "—"}</td>
                  <td style={td} className="num">
                    {m.quantity} {m.unit}
                    {m.isLow && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--brick)", borderRadius: 8, padding: "1px 6px" }}>{t("fashion.materials.low")}</span>}
                  </td>
                  <td style={td} className="num">{m.avgCost.toFixed(4)} {m.currency}</td>
                  <td style={td} className="num">{m.totalValue.toFixed(2)} {m.currency}</td>
                  <td style={td}>{m.supplierName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewMaterial categories={categories} suppliers={suppliers} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function NewMaterial({ categories, suppliers, onClose, onSaved }: { categories: Opt[]; suppliers: Opt[]; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [f, setF] = useState({ name: "", categoryId: "", sku: "", supplierId: "", brand: "", colorName: "", colorCode: "", unit: "m", minQuantity: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  async function save() {
    if (!f.name.trim()) { setErr(t("fashion.materials.errName")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/fashion/materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, categoryId: f.categoryId || null, sku: f.sku || null, supplierId: f.supplierId || null,
        brand: f.brand || null, colorName: f.colorName || null, colorCode: f.colorCode || null, unit: f.unit,
        minQuantity: f.minQuantity ? Number(f.minQuantity) : null, note: f.note || null,
      }),
    });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr((await r.json().catch(() => ({}))).error ?? t("fashion.settings.errSave"));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.materials.add")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("fashion.materials.name")} *</label><input style={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.materials.category")}</label>
            <select style={inp} value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              <option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.materials.sku")}</label><input style={inp} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.materials.supplier")}</label>
            <select style={inp} value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
              <option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.materials.brand")}</label><input style={inp} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.materials.color")}</label><input style={inp} value={f.colorName} onChange={(e) => setF({ ...f, colorName: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.materials.colorCode")}</label><input style={inp} value={f.colorCode} onChange={(e) => setF({ ...f, colorCode: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.materials.unit")}</label><input style={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="m / pcs / g" /></div>
          <div><label style={lbl}>{t("fashion.materials.minQty")}</label><input type="number" step="0.001" style={inp} value={f.minQuantity} onChange={(e) => setF({ ...f, minQuantity: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("fashion.materials.note")}</label><input style={inp} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0" }}>{t("fashion.materials.stockHint")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.materials.save")}</button>
        </div>
      </div>
    </div>
  );
}
