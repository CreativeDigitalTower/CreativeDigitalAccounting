"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { FASHION_BASE_PATH } from "@/lib/fashion/config";

type Supplier = { id: string; name: string };
type Mat = { id: string; name: string; unit: string; avgCost: number };
type Delivery = { id: string; date: string; supplierName: string | null; invoiceNumber: string | null; deliveryNumber: string | null; transportCost: number; extraCosts: number; currency: string; lineCount: number };
type Line = { materialId: string; quantity: string; unitPrice: string };

export function DeliveriesClient({ suppliers, materials, canManage }: { suppliers: Supplier[]; materials: Mat[]; canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { const r = await fetch("/api/fashion/deliveries"); if (r.ok) setRows(await r.json()); }
  useEffect(() => { load(); }, []);

  const dt = (x: string) => new Date(x).toLocaleDateString();
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={FASHION_BASE_PATH} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("fashion.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("fashion.nav.deliveries")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("fashion.deliveries.add")}</button>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("fashion.deliveries.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("fashion.deliveries.date")}</th><th style={th}>{t("fashion.deliveries.supplier")}</th><th style={th}>{t("fashion.deliveries.invoice")}</th>
              <th style={th}>{t("fashion.deliveries.lines")}</th><th style={th}>{t("fashion.deliveries.transport")}</th><th style={th}>{t("fashion.deliveries.extra")}</th>
            </tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td style={td}>{dt(d.date)}</td><td style={td}>{d.supplierName ?? "—"}</td><td style={td}>{d.invoiceNumber ?? "—"}</td>
                  <td style={td} className="num">{d.lineCount}</td>
                  <td style={td} className="num">{d.transportCost.toFixed(2)} {d.currency}</td>
                  <td style={td} className="num">{d.extraCosts.toFixed(2)} {d.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <NewDelivery suppliers={suppliers} materials={materials} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function NewDelivery({ suppliers, materials, onClose, onSaved }: { suppliers: Supplier[]; materials: Mat[]; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [head, setHead] = useState({ supplierId: "", date: new Date().toISOString().slice(0, 10), invoiceNumber: "", deliveryNumber: "", transportCost: "", extraCosts: "", note: "" });
  const [lines, setLines] = useState<Line[]>([{ materialId: "", quantity: "", unitPrice: "" }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const inp = { padding: "6px 9px", fontSize: 13, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const goodsTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const grand = goodsTotal + (Number(head.transportCost) || 0) + (Number(head.extraCosts) || 0);

  async function save() {
    const valid = lines.filter((l) => l.materialId && Number(l.quantity) > 0 && l.unitPrice !== "");
    if (!valid.length) { setErr(t("fashion.deliveries.errLines")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/fashion/deliveries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: head.supplierId || null, date: new Date(head.date).toISOString(),
        invoiceNumber: head.invoiceNumber || null, deliveryNumber: head.deliveryNumber || null,
        transportCost: Number(head.transportCost) || 0, extraCosts: Number(head.extraCosts) || 0,
        note: head.note || null,
        lines: valid.map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      }),
    });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr((await r.json().catch(() => ({}))).error ?? t("fashion.settings.errSave"));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 720, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 12px" }}>{t("fashion.deliveries.add")}</h3>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><label style={lbl}>{t("fashion.deliveries.supplier")}</label>
            <select style={inp} value={head.supplierId} onChange={(e) => setHead({ ...head, supplierId: e.target.value })}>
              <option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label style={lbl}>{t("fashion.deliveries.date")}</label><input type="date" style={inp} value={head.date} onChange={(e) => setHead({ ...head, date: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.deliveries.invoice")}</label><input style={inp} value={head.invoiceNumber} onChange={(e) => setHead({ ...head, invoiceNumber: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.deliveries.deliveryNo")}</label><input style={inp} value={head.deliveryNumber} onChange={(e) => setHead({ ...head, deliveryNumber: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.deliveries.transport")}</label><input type="number" step="0.01" style={inp} value={head.transportCost} onChange={(e) => setHead({ ...head, transportCost: e.target.value })} /></div>
          <div><label style={lbl}>{t("fashion.deliveries.extra")}</label><input type="number" step="0.01" style={inp} value={head.extraCosts} onChange={(e) => setHead({ ...head, extraCosts: e.target.value })} /></div>
        </div>

        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("fashion.deliveries.materials")}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 28px", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <select style={inp} value={l.materialId} onChange={(e) => setLine(i, { materialId: e.target.value })}>
              <option value="">— {t("fashion.deliveries.material")} —</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <input type="number" step="0.001" style={inp} placeholder={t("fashion.deliveries.qty")} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <input type="number" step="0.0001" style={inp} placeholder={t("fashion.deliveries.price")} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
            <button className="btn btn-ghost btn-sm" onClick={() => setLines((ls) => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)} style={{ padding: "4px 8px" }}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setLines((ls) => [...ls, { materialId: "", quantity: "", unitPrice: "" }])} style={{ marginBottom: 10 }}>+ {t("fashion.deliveries.addLine")}</button>

        <div style={{ textAlign: "right", fontSize: 13, marginBottom: 12 }}>
          {t("fashion.deliveries.goods")}: <strong className="num">{goodsTotal.toFixed(2)}</strong> · {t("fashion.deliveries.grand")}: <strong className="num">{grand.toFixed(2)}</strong>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 10px" }}>{t("fashion.deliveries.hint")}</p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("fashion.materials.cancel")}</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{t("fashion.deliveries.confirm")}</button>
        </div>
      </div>
    </div>
  );
}
