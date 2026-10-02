"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { payBadge } from "@/components/app/logistics/LogisticsHolcimInvoices";

type Line = {
  id: string; lineNumber: number | null; dispatchNoteSnapshot: string | null; truckSnapshot: string | null;
  materialCodeSnapshot: string | null; materialName: string | null; unit: string | null; productSnapshot: string | null;
  matchStatus: string | null; quantity: number; unitPrice: number;
  vatRate: number | null; lineTotal: number; vatAmount: number | null; grossAmount: number | null;
  shipment: { id: string; code: string } | null;
};
type PaymentRow = { id: string; amount: number; date: string | null; reason: string | null; note: string | null; method: string | null };
type ExportLink = { linkId: string; id: string; invoiceNumber: string; destination: string | null; quantity: number | null; unit: string; purchaseAmount: number | null; purchaseCurrency: string | null };
type Invoice = {
  id: string; number: string; date: string | null; taxEventDate: string | null; currency: string;
  supplierSnapshot: string | null; recipientSnapshot: string | null; paymentMethod: string | null; note: string | null;
  headerTaxBase: number | null; headerVatTotal: number | null; headerGrandTotal: number | null; originalFilename: string | null;
  links: Line[]; computed: { base: number; vat: number; total: number }; mismatch: { base: boolean; vat: boolean; total: boolean };
  payments: PaymentRow[]; paid: number; remaining: number; paymentStatus: "unpaid" | "partially_paid" | "paid"; exportLinks: ExportLink[];
};
type DeliveryOpt = { id: string; invoiceNumber: string };

export function HolcimInvoiceDetail({ id, canManage = false }: { id: string; canManage?: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryOpt[]>([]);
  const [pay, setPay] = useState({ amount: "", date: "", note: "" });
  const [linkSel, setLinkSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => fetch(`/api/logistics/supplier-invoices/${id}`).then((r) => r.ok ? r.json() : null).then(setInv);
  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (canManage) fetch("/api/logistics/export-sets?pageSize=100").then((r) => r.ok ? r.json() : null).then((j) => { if (j?.rows) setDeliveries(j.rows.map((x: { id: string; invoiceNumber: string }) => ({ id: x.id, invoiceNumber: x.invoiceNumber }))); }); }, [canManage]);

  async function addPayment(markRemaining = false) {
    setErr(""); setBusy(true);
    const body = markRemaining ? { markRemaining: true } : { amount: Number(pay.amount), date: pay.date ? new Date(pay.date).toISOString() : null, note: pay.note || null };
    const r = await fetch(`/api/logistics/supplier-invoices/${id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setPay({ amount: "", date: "", note: "" }); load();
  }
  async function delPayment(paymentId: string) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/supplier-invoices/${id}/payments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId }) });
    setBusy(false); if (r.ok) load();
  }
  async function linkDelivery() {
    if (!linkSel) return;
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/supplier-invoices/${id}/links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exportSetId: linkSel }) });
    setBusy(false); setLinkSel(""); if (r.ok) load();
  }
  async function unlinkDelivery(exportSetId: string) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/logistics/supplier-invoices/${id}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exportSetId }) });
    setBusy(false); if (r.ok) load();
  }
  if (!inv) return null;

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.5)" };
  const cur = inv.currency;
  const anyMismatch = inv.mismatch.base || inv.mismatch.vat || inv.mismatch.total;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/holcim-invoices" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.holcimInv.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.holcimInv.detailTitle")} {inv.number}</h1>
        {inv.originalFilename && <a className="btn btn-ghost btn-sm" href={`/api/logistics/supplier-invoices/${id}/file`} target="_blank" rel="noreferrer">{t("logistics.holcimInv.downloadPdf")}</a>}
      </div>

      <div className="glass panel" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, fontSize: 12.5 }}>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.issueDate")}: </span>{dt(inv.date)}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.taxEventDate")}: </span>{dt(inv.taxEventDate)}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.supplier")}: </span>{inv.supplierSnapshot ?? "—"}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.currency")}: </span>{inv.currency}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.paymentMethod")}: </span>{inv.paymentMethod ?? "—"}</div>
      </div>

      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>{t("logistics.holcimInv.line")}</th><th style={th}>{t("logistics.holcimInv.materialCode")}</th><th style={th}>{t("logistics.holcimInv.materialName")}</th>
            <th style={th}>{t("logistics.holcimInv.unit")}</th><th style={th}>{t("logistics.holcimInv.quantity")}</th><th style={th}>{t("logistics.holcimInv.unitPrice")}</th>
            <th style={th}>{t("logistics.holcimInv.base")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.holcimInv.total")}</th>
            <th style={th}>{t("logistics.holcimInv.dispatchNote")}</th><th style={th}>{t("logistics.holcimInv.vehicle")}</th><th style={th}>{t("logistics.shipments.code")}</th><th style={th}>{t("logistics.holcimInv.match")}</th>
          </tr></thead>
          <tbody>
            {inv.links.map((l) => (
              <tr key={l.id}>
                <td style={td}>{l.lineNumber ?? "—"}</td>
                <td style={td}>{l.materialCodeSnapshot ?? "—"}</td>
                <td style={td}>{l.materialName ?? l.productSnapshot ?? "—"}</td>
                <td style={td}>{l.unit ?? "—"}</td>
                <td style={td} className="num">{qty(l.quantity)}</td>
                <td style={td} className="num">{l.unitPrice}</td>
                <td style={td} className="num">{l.lineTotal}</td>
                <td style={td} className="num">{l.vatAmount ?? "—"}</td>
                <td style={td} className="num">{l.grossAmount ?? "—"}</td>
                <td style={td}>{l.dispatchNoteSnapshot ?? "—"}</td>
                <td style={td}>{l.truckSnapshot ?? "—"}</td>
                <td style={td}>{l.shipment ? <Link href={`/dashboard/logistics/shipments/${l.shipment.id}`} style={{ fontWeight: 600 }}>{l.shipment.code}</Link> : "—"}</td>
                <td style={{ ...td, fontSize: 11, whiteSpace: "nowrap" }}>
                  {l.matchStatus === "matched" ? <span style={{ color: "var(--emerald-dark,#0F8A6A)" }}>{t("logistics.holcimInv.statusMatched")}</span>
                    : l.matchStatus === "review" ? <span style={{ color: "var(--brass)" }}>{t("logistics.holcimInv.statusReview")}</span>
                    : <span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.statusUnmatched")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass panel" style={{ fontSize: 13 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.base")}: </span><strong className="num">{inv.computed.base} {cur}</strong>{inv.mismatch.base && <span style={{ color: "var(--brass)" }}> (⚠ {inv.headerTaxBase})</span>}</div>
          <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.vat")}: </span><strong className="num">{inv.computed.vat} {cur}</strong>{inv.mismatch.vat && <span style={{ color: "var(--brass)" }}> (⚠ {inv.headerVatTotal})</span>}</div>
          <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.total")}: </span><strong className="num">{inv.computed.total} {cur}</strong>{inv.mismatch.total && <span style={{ color: "var(--brass)" }}> (⚠ {inv.headerGrandTotal})</span>}</div>
        </div>
        {anyMismatch && <div style={{ color: "var(--brass)", fontSize: 12, marginTop: 6 }}>{t("logistics.holcimInv.headerMismatch")}</div>}
      </div>

      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, margin: "10px 0" }}>{err}</div>}

      {/* Payable summary + плащания (§H/§J) */}
      <div className="glass panel" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>{t("logistics.payable.payments")}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: "var(--muted)" }}>{t("logistics.payable.totalDue")}: </span><strong className="num">{inv.computed.total} {cur}</strong></div>
          <div style={{ fontSize: 13 }}><span style={{ color: "var(--muted)" }}>{t("logistics.payable.paid")}: </span><strong className="num">{inv.paid.toFixed(2)} {cur}</strong></div>
          <div style={{ fontSize: 13 }}><span style={{ color: "var(--muted)" }}>{t("logistics.payable.remaining")}: </span><strong className="num">{inv.remaining.toFixed(2)} {cur}</strong></div>
          {payBadge(inv.paymentStatus, t)}
        </div>
        {inv.payments.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead><tr><th style={th}>{t("logistics.payable.date")}</th><th style={th}>{t("logistics.payable.amount")}</th><th style={th}>{t("logistics.payable.note")}</th>{canManage && <th style={th} />}</tr></thead>
            <tbody>
              {inv.payments.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{dt(p.date)}</td><td style={td} className="num">{p.amount.toFixed(2)} {cur}</td><td style={td}>{p.reason ?? "—"}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", fontSize: 11, padding: "2px 8px" }} disabled={busy} onClick={() => delPayment(p.id)}>✕</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && inv.remaining > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="number" step="0.01" min={0} style={{ padding: "5px 8px", fontSize: 12.5, width: 120 }} placeholder={t("logistics.payable.amount")} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <input type="date" style={{ padding: "5px 8px", fontSize: 12.5 }} value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
            <input style={{ padding: "5px 8px", fontSize: 12.5, flex: "1 1 160px" }} placeholder={t("logistics.payable.note")} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
            <button className="btn btn-ghost btn-sm" disabled={busy || !(Number(pay.amount) > 0)} onClick={() => addPayment(false)}>{t("logistics.payable.addPayment")}</button>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => { if (confirm(t("logistics.payable.markPaidConfirm"))) addPayment(true); }}>{t("logistics.payable.markPaid")}</button>
          </div>
        )}
      </div>

      {/* Свързани експортни доставки (§G/§J) */}
      <div className="glass panel" style={{ marginTop: 14 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 10 }}>{t("logistics.payable.linkedDeliveries")}</div>
        {inv.exportLinks.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.payable.noLinks")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>{t("logistics.export.invoiceNumber")}</th><th style={th}>{t("logistics.export.destination")}</th><th style={th}>{t("logistics.export.quantity")}</th><th style={th}>{t("logistics.payable.purchaseAmount")}</th>{canManage && <th style={th} />}</tr></thead>
            <tbody>
              {inv.exportLinks.map((l) => (
                <tr key={l.linkId}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${l.id}`} style={{ fontWeight: 600 }}>{l.invoiceNumber}</Link></td>
                  <td style={td}>{l.destination ?? "—"}</td>
                  <td style={td} className="num">{l.quantity != null ? qtyUnit(l.quantity, l.unit) : "—"}</td>
                  <td style={td} className="num">{l.purchaseAmount != null ? `${l.purchaseAmount.toFixed(2)} ${l.purchaseCurrency ?? cur}` : "—"}</td>
                  {canManage && <td style={td}><button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", fontSize: 11, padding: "2px 8px" }} disabled={busy} onClick={() => unlinkDelivery(l.id)}>{t("logistics.payable.unlink")}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <select style={{ padding: "5px 8px", fontSize: 12.5, minWidth: 220 }} value={linkSel} onChange={(e) => setLinkSel(e.target.value)}>
              <option value="">{t("logistics.payable.selectDelivery")}</option>
              {deliveries.filter((d) => !inv.exportLinks.some((l) => l.id === d.id)).map((d) => <option key={d.id} value={d.id}>{d.invoiceNumber}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" disabled={busy || !linkSel} onClick={linkDelivery}>{t("logistics.payable.linkDelivery")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
