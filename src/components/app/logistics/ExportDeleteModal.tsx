"use client";
import { useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

export type DeletableSet = {
  id: string; invoiceNumber: string; invoiceDate: string | null; clientName: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string;
};

// Confirmation modal за изтриване на експортна доставка (§2/§3). Показва ключовите данни,
// за да няма грешно изтриване; при свързана MK фактура (409) блокира и предлага линк (§6).
export function ExportDeleteModal({ set, onClose, onDeleted }: { set: DeletableSet; onClose: () => void; onDeleted: () => void }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [blocked, setBlocked] = useState<{ id: string; number: string } | null>(null);
  const [reason, setReason] = useState("");

  async function confirmDelete() {
    setErr(""); setBusy(true);
    const r = await fetch(`/api/logistics/export-sets/${set.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason || null }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 409 && j?.error === "MK_INVOICE_LINKED") { setBlocked(j.mkInvoice); return; }
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onDeleted();
  }

  const dt = (x: string | null) => (x ? new Date(x).toLocaleDateString() : "—");
  const row = (l: string, v: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right", fontWeight: 500 }}>{v || "—"}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", padding: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 8px", color: "var(--brick)" }}>{t("logistics.export.deleteTitle")}</h2>

        {blocked ? (
          <>
            <p style={{ fontSize: 13, margin: "0 0 12px" }}>{t("logistics.export.deleteBlocked").replace("{number}", blocked.number)}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("logistics.common.cancel")}</button>
              <Link className="btn btn-primary btn-sm" href={`/dashboard/logistics/mk-sales/${blocked.id}`}>{t("logistics.export.openMkInvoice")}</Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, margin: "0 0 4px" }}>{t("logistics.export.deleteConfirm")}</p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>{t("logistics.export.deleteHint")}</p>
            <div style={{ background: "rgba(0,0,0,.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              {row(t("logistics.export.invoiceNumber"), set.invoiceNumber)}
              {row(t("logistics.export.date"), dt(set.invoiceDate))}
              {row(t("logistics.export.client"), set.clientName)}
              {row(t("logistics.export.truck"), [set.truckRegSnapshot, set.trailerReg].filter(Boolean).join(" / "))}
              {row(t("logistics.export.product"), set.productSnapshot)}
              {row(t("logistics.export.quantity"), set.quantity != null ? qtyUnit(set.quantity, set.unit) : "—")}
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("logistics.export.deleteReason")} style={{ width: "100%", padding: "6px 9px", fontSize: 12.5, marginBottom: 10 }} />
            {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
              <button className="btn btn-sm" style={{ background: "var(--brick)", color: "#fff" }} onClick={confirmDelete} disabled={busy}>{t("logistics.export.deleteConfirmBtn")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
