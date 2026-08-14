"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Invoice = { id: string; number: string; date: string | null; currency: string; shipments: number; base: number; vat: number; total: number; mismatch: boolean };
type Unfactured = { id: string; code: string; dispatchNoteNumber: string | null; dispatchDate: string | null; vehicleRegSnapshot: string | null; productNameSnapshot: string | null; materialCodeSnapshot: string | null; netQuantity: number; unit: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

type LineState = { on: boolean; lineNumber: string; unitPrice: string; quantity: string };

export function LogisticsHolcimInvoices({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Invoice[]>([]);
  const [unf, setUnf] = useState<Unfactured[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hdr, setHdr] = useState({ number: "", issueDate: "", taxEventDate: "", vatRate: "20", currency: "EUR", paymentMethod: "", note: "", taxBase: "", vatTotal: "", grandTotal: "" });
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [pdf, setPdf] = useState<File | null>(null);

  async function load() {
    const [ri, ru] = await Promise.all([fetch("/api/logistics/supplier-invoices"), fetch("/api/logistics/supplier-invoices/unfactured")]);
    if (ri.ok) setItems(await ri.json());
    if (ru.ok) setUnf(await ru.json());
  }
  useEffect(() => { load(); }, []);

  const rate = hdr.vatRate ? Number(hdr.vatRate) : 0;
  const selected = useMemo(() => unf.filter((s) => lines[s.id]?.on && lines[s.id]?.unitPrice), [unf, lines]);
  const totals = useMemo(() => {
    let base = 0, vat = 0;
    for (const s of selected) {
      const ln = lines[s.id];
      const qty = ln.quantity ? Number(ln.quantity) : s.netQuantity;
      const net = round2(qty * Number(ln.unitPrice));
      base = round2(base + net); vat = round2(vat + round2(net * rate / 100));
    }
    return { base, vat, total: round2(base + vat) };
  }, [selected, lines, rate]);
  // Валидация: въведените header тотали срещу изчислените.
  const headerMismatch = (hdr.grandTotal && Math.abs(Number(hdr.grandTotal) - totals.total) > 0.01)
    || (hdr.taxBase && Math.abs(Number(hdr.taxBase) - totals.base) > 0.01);

  function setLine(id: string, patch: Partial<LineState>) {
    setLines((p) => {
      const base: LineState = p[id] ?? { on: false, lineNumber: "", unitPrice: "", quantity: "" };
      return { ...p, [id]: { ...base, ...patch } };
    });
  }

  async function create() {
    if (selected.length === 0) { setErr(t("logistics.holcimInv.selectAtLeastOne")); return; }
    setErr(""); setBusy(true);
    let file: unknown = null;
    if (pdf) file = { originalFilename: pdf.name, mimeType: pdf.type || "application/pdf", size: pdf.size, dataUrl: await fileToDataUrl(pdf) };
    const r = await fetch("/api/logistics/supplier-invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: hdr.number, date: hdr.issueDate ? new Date(hdr.issueDate).toISOString() : null,
        taxEventDate: hdr.taxEventDate ? new Date(hdr.taxEventDate).toISOString() : null,
        currency: hdr.currency, vatRate: hdr.vatRate ? Number(hdr.vatRate) : null, paymentMethod: hdr.paymentMethod || null, note: hdr.note || null,
        headerTaxBase: hdr.taxBase ? Number(hdr.taxBase) : null, headerVatTotal: hdr.vatTotal ? Number(hdr.vatTotal) : null, headerGrandTotal: hdr.grandTotal ? Number(hdr.grandTotal) : null,
        file,
        lines: selected.map((s) => ({ shipmentId: s.id, lineNumber: lines[s.id].lineNumber ? Number(lines[s.id].lineNumber) : null, unitPrice: Number(lines[s.id].unitPrice), quantity: lines[s.id].quantity ? Number(lines[s.id].quantity) : null })),
      }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setHdr({ number: "", issueDate: "", taxEventDate: "", vatRate: "20", currency: "EUR", paymentMethod: "", note: "", taxBase: "", vatTotal: "", grandTotal: "" });
    setLines({}); setPdf(null); setOpen(false); load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const inp = { padding: "6px 9px", fontSize: 13 } as const;
  const th = { textAlign: "left" as const, padding: "6px 7px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 7px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.holcimInv.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.holcimInv.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.number")}</label><input style={{ ...inp, width: "100%" }} value={hdr.number} onChange={(e) => setHdr({ ...hdr, number: e.target.value })} placeholder="1430352748" /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.issueDate")}</label><input type="date" style={{ ...inp, width: "100%" }} value={hdr.issueDate} onChange={(e) => setHdr({ ...hdr, issueDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.taxEventDate")}</label><input type="date" style={{ ...inp, width: "100%" }} value={hdr.taxEventDate} onChange={(e) => setHdr({ ...hdr, taxEventDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.vatRate")}</label><input type="number" step="0.01" style={{ ...inp, width: "100%" }} value={hdr.vatRate} onChange={(e) => setHdr({ ...hdr, vatRate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.currency")}</label><input style={{ ...inp, width: "100%" }} value={hdr.currency} onChange={(e) => setHdr({ ...hdr, currency: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.paymentMethod")}</label><input style={{ ...inp, width: "100%" }} value={hdr.paymentMethod} onChange={(e) => setHdr({ ...hdr, paymentMethod: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.pdf")}</label><input type="file" accept=".pdf,application/pdf,image/*" style={{ fontSize: 11 }} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
          </div>

          {/* Lines */}
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.holcimInv.unfactured")}</div>
          {unf.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.holcimInv.noUnfactured")}</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}></th><th style={th}>{t("logistics.holcimInv.lineNumber")}</th><th style={th}>{t("logistics.shipments.dispatchNote")}</th>
                  <th style={th}>{t("logistics.shipments.vehicle")}</th><th style={th}>{t("logistics.holcimInv.material")}</th>
                  <th style={th}>{t("logistics.holcimInv.quantity")}</th><th style={th}>{t("logistics.holcimInv.unitPrice")}</th>
                  <th style={th}>{t("logistics.holcimInv.base")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.holcimInv.total")}</th><th style={th}>{t("logistics.holcimInv.match")}</th>
                </tr></thead>
                <tbody>
                  {unf.map((s) => {
                    const ln = lines[s.id];
                    const on = !!ln?.on;
                    const qty = on && ln.quantity ? Number(ln.quantity) : s.netQuantity;
                    const price = on && ln.unitPrice ? Number(ln.unitPrice) : null;
                    const net = price != null ? round2(qty * price) : null;
                    const vat = net != null ? round2(net * rate / 100) : null;
                    const gross = net != null && vat != null ? round2(net + vat) : null;
                    const qtyDiff = on && ln.quantity !== "" && Math.abs(Number(ln.quantity) - s.netQuantity) > 0.001;
                    return (
                      <tr key={s.id}>
                        <td style={td}><input type="checkbox" checked={on} onChange={(e) => setLine(s.id, { on: e.target.checked })} /></td>
                        <td style={td}>{on && <input style={{ ...inp, width: 50, padding: "3px 5px" }} value={ln.lineNumber} onChange={(e) => setLine(s.id, { lineNumber: e.target.value })} placeholder="10" />}</td>
                        <td style={td}>{s.dispatchNoteNumber ?? "—"}</td>
                        <td style={td}>{s.vehicleRegSnapshot ?? "—"}</td>
                        <td style={td}>{s.materialCodeSnapshot ?? "—"}</td>
                        <td style={td}>{on ? <input type="number" step="0.001" style={{ ...inp, width: 78, padding: "3px 5px" }} value={ln.quantity} onChange={(e) => setLine(s.id, { quantity: e.target.value })} placeholder={String(s.netQuantity)} /> : <span className="num">{s.netQuantity} {s.unit}</span>}</td>
                        <td style={td}>{on && <input type="number" step="0.01" style={{ ...inp, width: 70, padding: "3px 5px" }} value={ln.unitPrice} onChange={(e) => setLine(s.id, { unitPrice: e.target.value })} placeholder="70" />}</td>
                        <td style={td} className="num">{net ?? "—"}</td>
                        <td style={td} className="num">{vat ?? "—"}</td>
                        <td style={td} className="num">{gross ?? "—"}</td>
                        <td style={td}>{on ? (qtyDiff ? <span style={{ color: "var(--brass)" }} title={t("logistics.holcimInv.warnQuantity")}>{t("logistics.holcimInv.warnQuantity")}</span> : <span style={{ color: "var(--emerald-dark,#0F8A6A)" }}>{t("logistics.holcimInv.matchOk")}</span>) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals + validation */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.computedTotals")}:</span>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.base")}: <strong className="num">{totals.base}</strong></span>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.vat")}: <strong className="num">{totals.vat}</strong></span>
            <span style={{ fontSize: 13 }}>{t("logistics.holcimInv.total")}: <strong className="num">{totals.total} {hdr.currency}</strong></span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.headerTotals")}:</span>
            <input style={{ ...inp, width: 100 }} value={hdr.taxBase} onChange={(e) => setHdr({ ...hdr, taxBase: e.target.value })} placeholder={t("logistics.holcimInv.base")} />
            <input style={{ ...inp, width: 90 }} value={hdr.vatTotal} onChange={(e) => setHdr({ ...hdr, vatTotal: e.target.value })} placeholder={t("logistics.holcimInv.vat")} />
            <input style={{ ...inp, width: 100 }} value={hdr.grandTotal} onChange={(e) => setHdr({ ...hdr, grandTotal: e.target.value })} placeholder={t("logistics.holcimInv.total")} />
            <button className="btn btn-primary btn-sm" disabled={busy || !hdr.number || selected.length === 0} onClick={create} style={{ marginLeft: "auto" }}>{t("logistics.holcimInv.create")}</button>
          </div>
          {headerMismatch && <div style={{ color: "var(--brass)", fontSize: 12, marginTop: 6 }}>{t("logistics.holcimInv.headerMismatch")}</div>}
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
                  <td style={td}><Link href={`/dashboard/logistics/holcim-invoices/${inv.id}`} style={{ fontWeight: 600 }}>{inv.number}</Link>{inv.mismatch && <span title={t("logistics.holcimInv.headerMismatch")} style={{ color: "var(--brass)", marginLeft: 6 }}>⚠</span>}</td>
                  <td style={td}>{dt(inv.date)}</td><td style={td} className="num">{inv.shipments}</td>
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
