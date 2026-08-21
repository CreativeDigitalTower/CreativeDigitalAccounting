"use client";
import { useEffect, useState } from "react";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";

type Proforma = {
  id: string; number: string | null; date: string | null; productSnapshot: string | null;
  initialQuantity: number; unit: string; currency: string; unitPrice: number | null;
  status: string; used: number; remaining: number; negative: boolean;
};
type Product = { id: string; canonicalName: string };
type Allocatable = { id: string; code: string; dispatchNoteNumber: string | null; netQuantity: number; unit: string; productNameSnapshot: string | null };

export function LogisticsProformas({ canManage, products }: { canManage: boolean; products: Product[] }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [items, setItems] = useState<Proforma[]>([]);
  const [alloc, setAlloc] = useState<Allocatable[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ number: "", date: "", productId: "", initialQuantity: "", unitPrice: "", currency: "EUR" });
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  async function load() {
    const [rp, ra] = await Promise.all([fetch("/api/logistics/proformas"), fetch("/api/logistics/proformas/allocatable")]);
    if (rp.ok) setItems(await rp.json());
    if (ra.ok) setAlloc(await ra.json());
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/proformas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: f.number || null, date: f.date ? new Date(f.date).toISOString() : null, productId: f.productId || null, initialQuantity: Number(f.initialQuantity), unitPrice: f.unitPrice ? Number(f.unitPrice) : null, currency: f.currency }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setF({ number: "", date: "", productId: "", initialQuantity: "", unitPrice: "", currency: "EUR" }); setOpen(false); load();
  }

  async function allocate(proformaId: string, shipmentId: string, force = false) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/proformas/${proformaId}/allocate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipmentId, force }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (r.status === 409 && j.needsConfirm) {
      if (window.confirm(t("logistics.proformas.negativeConfirm"))) return allocate(proformaId, shipmentId, true);
      return;
    }
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setPickFor(null); setPick(""); load();
  }

  async function setStatus(id: string, status: string) {
    const r = await fetch(`/api/logistics/proformas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (r.ok) load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.proformas.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.proformas.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.proformas.number")}</label><br /><input style={{ ...inp, width: 130 }} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.proformas.date")}</label><br /><input type="date" style={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div style={{ minWidth: 200 }}><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.proformas.product")}</label>
            <SearchableSelect options={products.map((p) => ({ value: p.id, label: p.canonicalName }))} value={f.productId} onChange={(v) => setF({ ...f, productId: v })} emptyLabel="—" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.proformas.initial")}</label><br /><input type="number" step="0.001" style={{ ...inp, width: 100 }} value={f.initialQuantity} onChange={(e) => setF({ ...f, initialQuantity: e.target.value })} placeholder="300" /></div>
          <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.proformas.unitPrice")}</label><br /><input type="number" step="0.01" style={{ ...inp, width: 90 }} value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !(Number(f.initialQuantity) > 0)} onClick={create}>{t("logistics.common.save")}</button>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.proformas.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.proformas.number")}</th><th style={th}>{t("logistics.proformas.date")}</th><th style={th}>{t("logistics.proformas.product")}</th>
              <th style={th}>{t("logistics.proformas.initial")}</th><th style={th}>{t("logistics.proformas.used")}</th><th style={th}>{t("logistics.proformas.remaining")}</th>
              <th style={th}>{t("logistics.proformas.status")}</th>{canManage && <th style={th}>{t("logistics.common.actions")}</th>}
            </tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td style={td}><strong>{p.number ?? "—"}</strong></td>
                  <td style={td}>{dt(p.date)}</td>
                  <td style={td}>{p.productSnapshot ?? "—"}</td>
                  <td style={td} className="num">{qtyUnit(p.initialQuantity, p.unit)}</td>
                  <td style={td} className="num">{qtyUnit(p.used, p.unit)}</td>
                  <td style={{ ...td, color: p.negative ? "var(--brick)" : "inherit", fontWeight: 600 }} className="num">{qtyUnit(p.remaining, p.unit)}</td>
                  <td style={td}>{t(`logistics.proformas.status${p.status.charAt(0).toUpperCase() + p.status.slice(1)}`)}</td>
                  {canManage && (
                    <td style={td}>
                      {pickFor === p.id ? (
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...inp, fontSize: 12 }}>
                            <option value="">—</option>
                            {alloc.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.netQuantity} {s.unit}</option>)}
                          </select>
                          <button className="btn btn-primary btn-sm" disabled={!pick || busy} onClick={() => allocate(p.id, pick)}>OK</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setPickFor(null); setPick(""); }}>✕</button>
                        </span>
                      ) : (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setPickFor(p.id)} disabled={alloc.length === 0}>{t("logistics.proformas.allocate")}</button>{" "}
                          {p.status === "active" && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p.id, "closed")}>{t("logistics.proformas.statusClosed")}</button>}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
