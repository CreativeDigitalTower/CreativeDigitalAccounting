"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Line = {
  id: string; lineNumber: number | null; dispatchNoteSnapshot: string | null; truckSnapshot: string | null;
  materialCodeSnapshot: string | null; materialName: string | null; unit: string | null; productSnapshot: string | null;
  matchStatus: string | null; quantity: number; unitPrice: number;
  vatRate: number | null; lineTotal: number; vatAmount: number | null; grossAmount: number | null;
  shipment: { id: string; code: string } | null;
};
type Invoice = {
  id: string; number: string; date: string | null; taxEventDate: string | null; currency: string;
  supplierSnapshot: string | null; recipientSnapshot: string | null; paymentMethod: string | null; note: string | null;
  headerTaxBase: number | null; headerVatTotal: number | null; headerGrandTotal: number | null; originalFilename: string | null;
  links: Line[]; computed: { base: number; vat: number; total: number }; mismatch: { base: boolean; vat: boolean; total: boolean };
};

export function HolcimInvoiceDetail({ id }: { id: string }) {
  const t = useT();
  const [inv, setInv] = useState<Invoice | null>(null);
  useEffect(() => { fetch(`/api/logistics/supplier-invoices/${id}`).then((r) => r.ok ? r.json() : null).then(setInv); }, [id]);
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
                <td style={td} className="num">{l.quantity}</td>
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
    </div>
  );
}
