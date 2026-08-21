"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SHIPMENT_STATUSES } from "@/lib/logistics/config";
import { ShipmentTransport } from "@/components/app/logistics/ShipmentTransport";
import { ShipmentDocuments } from "@/components/app/logistics/ShipmentDocuments";
import { ShipmentCosts } from "@/components/app/logistics/ShipmentCosts";

type History = { id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string };
export type ShipmentDto = {
  id: string; code: string; dispatchNoteNumber: string | null; dispatchDate: string | null; status: string;
  vehicleRegSnapshot: string | null; trailerReg: string | null; carrierSnapshot: string | null; driver: string | null;
  productNameSnapshot: string | null; materialCodeSnapshot: string | null; unit: string;
  grossWeight: number | null; tara: number | null; netQuantity: number | null;
  contract: string | null; clientNumber: string | null; factory: string | null; loadingPlace: string | null;
  entryAt: string | null; exitAt: string | null; incoterm: string | null; destination: string | null; recipient: string | null;
  note: string | null; createdAt: string; statusHistory: History[];
  proforma?: { number: string | null; quantity: number } | null;
  purchase?: {
    invoiceId: string; invoiceNumber: string; lineNumber: number | null;
    quantity: number; unitPrice: number; net: number; vat: number | null; gross: number | null; currency: string;
  } | null;
};

export function ShipmentDetail({ shipment, canManage }: { shipment: ShipmentDto; canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const router = useRouter();
  const [s, setS] = useState(shipment);
  const [busy, setBusy] = useState(false);
  const [newStatus, setNewStatus] = useState(shipment.status);

  async function changeStatus() {
    if (newStatus === s.status) return;
    setBusy(true);
    const r = await fetch(`/api/logistics/shipments/${s.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setBusy(false);
    if (r.ok) router.refresh();
  }

  const dt = (v: string | null) => v ? new Date(v).toLocaleDateString() : "—";
  const dtt = (v: string | null) => v ? new Date(v).toLocaleString() : "—";
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );
  const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="glass panel" style={{ marginBottom: 14 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{title}</h3>{children}
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/shipments" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.shipments.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{s.code}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, background: "rgba(15,138,106,.12)", color: "var(--emerald-dark,#0F8A6A)", borderRadius: 12, padding: "3px 11px" }}>{t(`logistics.shipmentStatus.${s.status}`)}</span>
      </div>

      {canManage && (
        <div className="glass panel" style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.shipDetail.changeStatus")}:</span>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ padding: "5px 8px", fontSize: 13 }}>
            {SHIPMENT_STATUSES.map((st) => <option key={st} value={st}>{t(`logistics.shipmentStatus.${st}`)}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" disabled={busy || newStatus === s.status} onClick={changeStatus}>{t("logistics.shipDetail.changeStatus")}</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        <div>
          <Panel title={t("logistics.shipDetail.basic")}>
            <Row l={t("logistics.shipments.date")} v={dt(s.dispatchDate)} />
            <Row l={t("logistics.shipNew.product")} v={s.productNameSnapshot} />
            <Row l={t("logistics.shipNew.net")} v={s.netQuantity != null ? qtyUnit(s.netQuantity, s.unit) : "—"} />
            <Row l={t("logistics.shipNew.gross")} v={s.grossWeight != null ? qtyUnit(s.grossWeight, s.unit) : "—"} />
            <Row l={t("logistics.shipNew.tara")} v={s.tara != null ? qtyUnit(s.tara, s.unit) : "—"} />
          </Panel>
          <Panel title={t("logistics.shipDetail.holcim")}>
            <Row l={t("logistics.shipNew.dispatchNote")} v={s.dispatchNoteNumber} />
            <Row l={t("logistics.shipNew.materialCode")} v={s.materialCodeSnapshot} />
            <Row l={t("logistics.shipNew.contract")} v={s.contract} />
            <Row l={t("logistics.shipNew.clientNumber")} v={s.clientNumber} />
            <Row l={t("logistics.shipNew.factory")} v={s.factory} />
            <Row l={t("logistics.proformas.title")} v={s.proforma ? `${s.proforma.number ?? "—"} · ${qtyUnit(s.proforma.quantity, s.unit)}` : "—"} />
            {s.purchase ? (
              <>
                <Row l={t("logistics.holcimInv.title")} v={<Link href={`/dashboard/logistics/holcim-invoices/${s.purchase.invoiceId}`}>{s.purchase.invoiceNumber}{s.purchase.lineNumber != null ? ` · ${t("logistics.holcimInv.line")} ${s.purchase.lineNumber}` : ""}</Link>} />
                <Row l={t("logistics.holcimInv.unitPrice")} v={`${s.purchase.unitPrice} ${s.purchase.currency}/${s.unit}`} />
                <Row l={t("logistics.holcimInv.base")} v={`${s.purchase.net} ${s.purchase.currency}`} />
                <Row l={t("logistics.holcimInv.vat")} v={s.purchase.vat != null ? `${s.purchase.vat} ${s.purchase.currency}` : "—"} />
                <Row l={t("logistics.holcimInv.total")} v={s.purchase.gross != null ? `${s.purchase.gross} ${s.purchase.currency}` : "—"} />
              </>
            ) : <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{t("logistics.shipDetail.phaseHolcim")}</div>}
          </Panel>
          <Panel title={t("logistics.shipDetail.transport")}>
            <Row l={t("logistics.shipNew.vehicle")} v={s.vehicleRegSnapshot} />
            <Row l={t("logistics.shipNew.trailer")} v={s.trailerReg} />
            <Row l={t("logistics.shipNew.carrier")} v={s.carrierSnapshot} />
            <Row l={t("logistics.shipNew.driver")} v={s.driver} />
            <Row l={t("logistics.shipNew.incoterm")} v={s.incoterm} />
            <Row l={t("logistics.shipNew.loadingPlace")} v={s.loadingPlace} />
            <Row l={t("logistics.shipNew.entryAt")} v={dtt(s.entryAt)} />
            <Row l={t("logistics.shipNew.exitAt")} v={dtt(s.exitAt)} />
            <ShipmentTransport shipmentId={s.id} canManage={canManage} />
          </Panel>
        </div>
        <div>
          <Panel title={t("logistics.shipDetail.border")}>
            <Row l={t("logistics.shipNew.destination")} v={s.destination} />
            <Row l={t("logistics.shipNew.recipient")} v={s.recipient} />
            <div style={{ marginTop: 10 }}><ShipmentCosts shipmentId={s.id} canManage={canManage} /></div>
          </Panel>
          <Panel title={t("logistics.shipDetail.sale")}>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.shipDetail.phaseSale")}</div>
          </Panel>
          <Panel title={t("logistics.shipDetail.documents")}>
            <ShipmentDocuments shipmentId={s.id} canManage={canManage} />
          </Panel>
          <Panel title={t("logistics.shipDetail.history")}>
            {s.statusHistory.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> :
              s.statusHistory.map((h) => (
                <div key={h.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                  <strong>{new Date(h.createdAt).toLocaleString()}</strong> · {h.fromStatus ? `${t(`logistics.shipmentStatus.${h.fromStatus}`)} → ` : ""}{t(`logistics.shipmentStatus.${h.toStatus}`)}
                </div>
              ))}
          </Panel>
        </div>
      </div>
      {s.note && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 12, whiteSpace: "pre-wrap" }}>{s.note}</p>}
    </div>
  );
}
