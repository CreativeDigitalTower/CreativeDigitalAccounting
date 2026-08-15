"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Trace = { shipmentId: string; shipmentCode: string; dispatchNote: string | null; holcimInvoice: string | null; holcimInvoiceId: string | null; proforma: string | null };
type Line = { id: string; productSnapshot: string | null; unit: string; quantity: number; unitPrice: number; lineTotal: number; vatAmount: number | null; grossAmount: number | null; trace: Trace | null };
type Invoice = { id: string; number: string; date: string | null; currency: string; vatRate: number | null; note: string | null; issuer: string; recipient: string; direction: string; net: number; vat: number; gross: number; lines: Line[] };

export function BgMkInvoiceDetail({ id }: { id: string }) {
  const t = useT();
  const [inv, setInv] = useState<Invoice | null>(null);
  useEffect(() => { fetch(`/api/logistics/bg-mk-invoices/${id}`).then((r) => r.ok ? r.json() : null).then(setInv); }, [id]);
  if (!inv) return null;

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.5)" };
  const cur = inv.currency;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/bg-mk" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.bgmk.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{inv.number}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, background: "rgba(15,138,106,.12)", color: "var(--emerald-dark,#0F8A6A)", borderRadius: 12, padding: "3px 11px" }}>
          {inv.direction === "issued" ? t("logistics.bgmk.directionIssued") : t("logistics.bgmk.directionReceived")}
        </span>
      </div>

      <div className="glass panel" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, fontSize: 12.5 }}>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.date")}: </span>{dt(inv.date)}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.issued")}: </span>{inv.issuer}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.counterparty")}: </span>{inv.recipient}</div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.vatRate")}: </span>{inv.vatRate ?? "—"}</div>
      </div>

      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>{t("logistics.bgmk.product")}</th><th style={th}>{t("logistics.bgmk.quantity")}</th><th style={th}>{t("logistics.bgmk.unitPrice")}</th>
            <th style={th}>{t("logistics.bgmk.net")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.bgmk.gross")}</th>
            <th style={th}>{t("logistics.bgmk.traceTitle")}</th>
          </tr></thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id}>
                <td style={td}>{l.productSnapshot ?? "—"}</td>
                <td style={td} className="num">{l.quantity} {l.unit}</td>
                <td style={td} className="num">{l.unitPrice}</td>
                <td style={td} className="num">{l.lineTotal}</td>
                <td style={td} className="num">{l.vatAmount ?? "—"}</td>
                <td style={td} className="num">{l.grossAmount ?? "—"}</td>
                <td style={{ ...td, fontSize: 11 }}>
                  {l.trace ? (
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <Link href={`/dashboard/logistics/shipments/${l.trace.shipmentId}`}>{l.trace.shipmentCode}</Link>
                      {l.trace.dispatchNote && <span style={{ color: "var(--muted)" }}>· {l.trace.dispatchNote}</span>}
                      {l.trace.holcimInvoiceId && <>· <Link href={`/dashboard/logistics/holcim-invoices/${l.trace.holcimInvoiceId}`}>{l.trace.holcimInvoice}</Link></>}
                      {l.trace.proforma && <span style={{ color: "var(--muted)" }}>· {t("logistics.bgmk.proforma")} {l.trace.proforma}</span>}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass panel" style={{ fontSize: 13, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.net")}: </span><strong className="num">{inv.net} {cur}</strong></div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.vat")}: </span><strong className="num">{inv.vat} {cur}</strong></div>
        <div><span style={{ color: "var(--muted)" }}>{t("logistics.bgmk.gross")}: </span><strong className="num">{inv.gross} {cur}</strong></div>
      </div>
    </div>
  );
}
