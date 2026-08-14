"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { lineTotal, invoiceTotals } from "@/lib/logistics/purchaseCalc";

type Invoice = { id: string; number: string; date: string | null; currency: string; vatRate: number | null; shipments: number; base: number; vat: number; total: number };
type Unfactured = { id: string; code: string; dispatchNoteNumber: string | null; dispatchDate: string | null; vehicleRegSnapshot: string | null; productNameSnapshot: string | null; netQuantity: number; unit: string };

export function LogisticsHolcimInvoices({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Invoice[]>([]);
  const [unf, setUnf] = useState<Unfactured[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hdr, setHdr] = useState({ number: "", date: "", vatRate: "", currency: "EUR" });
  const [prices, setPrices] = useState<Record<string, string>>({}); // shipmentId → unitPrice ("" = not selected)

  async function load() {
    const [ri, ru] = await Promise.all([fetch("/api/logistics/supplier-invoices"), fetch("/api/logistics/supplier-invoices/unfactured")]);
    if (ri.ok) setItems(await ri.json());
    if (ru.ok) setUnf(await ru.json());
  }
  useEffect(() => { load(); }, []);

  const selected = useMemo(() => unf.filter((s) => prices[s.id] !== undefined && prices[s.id] !== ""), [unf, prices]);
  const totals = useMemo(() => invoiceTotals(selected.map((s) => ({ quantity: s.netQuantity, unitPrice: Number(prices[s.id]) })), hdr.vatRate ? Number(hdr.vatRate) : null), [selected, prices, hdr.vatRate]);

  async function create() {
    if (selected.length === 0) { setErr(t("logistics.holcimInv.selectAtLeastOne")); return; }
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/supplier-invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: hdr.number, date: hdr.date ? new Date(hdr.date).toISOString() : null, currency: hdr.currency,
        vatRate: hdr.vatRate ? Number(hdr.vatRate) : null,
        lines: selected.map((s) => ({ shipmentId: s.id, unitPrice: Number(prices[s.id]) })),
      }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setHdr({ number: "", date: "", vatRate: "", currency: "EUR" }); setPrices({}); setOpen(false); load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.holcimInv.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.holcimInv.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.number")}</label><br /><input style={{ ...inp, width: 150 }} value={hdr.number} onChange={(e) => setHdr({ ...hdr, number: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.date")}</label><br /><input type="date" style={inp} value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.vatRate")}</label><br /><input type="number" step="0.01" style={{ ...inp, width: 80 }} value={hdr.vatRate} onChange={(e) => setHdr({ ...hdr, vatRate: e.target.value })} placeholder="20" /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.currency")}</label><br /><input style={{ ...inp, width: 70 }} value={hdr.currency} onChange={(e) => setHdr({ ...hdr, currency: e.target.value })} /></div>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.holcimInv.unfactured")}</div>
          {unf.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.holcimInv.noUnfactured")}</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}></th><th style={th}>{t("logistics.shipments.code")}</th><th style={th}>{t("logistics.shipments.dispatchNote")}</th>
                  <th style={th}>{t("logistics.shipments.vehicle")}</th><th style={th}>{t("logistics.shipments.product")}</th>
                  <th style={th}>{t("logistics.shipments.qty")}</th><th style={th}>{t("logistics.holcimInv.unitPrice")}</th><th style={th}>{t("logistics.holcimInv.lineTotal")}</th>
                </tr></thead>
                <tbody>
                  {unf.map((s) => {
                    const on = prices[s.id] !== undefined;
                    const lt = on && prices[s.id] ? lineTotal(s.netQuantity, Number(prices[s.id])) : null;
                    return (
                      <tr key={s.id}>
                        <td style={td}><input type="checkbox" checked={on} onChange={(e) => setPrices((p) => { const n = { ...p }; if (e.target.checked) n[s.id] = ""; else delete n[s.id]; return n; })} /></td>
                        <td style={td}>{s.code}</td><td style={td}>{s.dispatchNoteNumber ?? "—"}</td>
                        <td style={td}>{s.vehicleRegSnapshot ?? "—"}</td><td style={td}>{s.productNameSnapshot ?? "—"}</td>
                        <td style={td} className="num">{s.netQuantity} {s.unit}</td>
                        <td style={td}>{on && <input type="number" step="0.01" style={{ ...inp, width: 80 }} value={prices[s.id]} onChange={(e) => setPrices((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="70" />}</td>
                        <td style={td} className="num">{lt != null ? lt : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", gap: 18, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.base")}: <strong className="num">{totals.base} {hdr.currency}</strong></span>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.vat")} ({totals.vatRate}%): <strong className="num">{totals.vat}</strong></span>
            <span style={{ fontSize: 13 }}>{t("logistics.holcimInv.total")}: <strong className="num">{totals.total} {hdr.currency}</strong></span>
            <button className="btn btn-primary btn-sm" disabled={busy || !hdr.number || selected.length === 0} onClick={create} style={{ marginLeft: "auto" }}>{t("logistics.holcimInv.create")}</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.holcimInv.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.holcimInv.number")}</th><th style={th}>{t("logistics.holcimInv.date")}</th><th style={th}>{t("logistics.holcimInv.shipments")}</th>
              <th style={th}>{t("logistics.holcimInv.base")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.holcimInv.total")}</th>
            </tr></thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id}>
                  <td style={td}><strong>{inv.number}</strong></td><td style={td}>{dt(inv.date)}</td><td style={td} className="num">{inv.shipments}</td>
                  <td style={td} className="num">{inv.base} {inv.currency}</td><td style={td} className="num">{inv.vat}</td><td style={td} className="num">{inv.total} {inv.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
