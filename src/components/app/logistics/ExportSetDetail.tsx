"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";
import { deriveExportSetStatus, finalizedActiveCount } from "@/lib/logistics/exportStatus";
import { ExportDeleteModal } from "@/components/app/logistics/ExportDeleteModal";
import { ExportDossierExtras } from "@/components/app/logistics/ExportDossierExtras";

type Doc = { id: string; docType: string; status: string; overridden: boolean; updatedAt: string };
type SetDto = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; truckVehicleId: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; declarationCmrDate: string | null; dispatchNumber: string | null;
  status: string; sellerName: string | null; buyerName: string | null; clientName: string | null; documents: Doc[];
  mkInvoice?: MkInvoiceRef | null;
  viewerRole?: string;
};
type MkInvoiceRef = { id: string; number: string; kind?: "document" | "mk"; date?: string | null };
const DOC_LABEL: Record<string, string> = { invoice: "docInvoice", dispatch: "docDispatch", declaration: "docDeclaration", cmr_epson: "docCmrEpson", cmr_hp: "docCmrHp" };
// Цветове на derived статус badge-а (общи с списъка) — без emoji, от design system.
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  no_docs: { bg: "rgba(0,0,0,.06)", fg: "var(--muted)" },
  draft: { bg: "var(--brass-soft,rgba(192,138,45,.14))", fg: "var(--brass,#9A6B18)" },
  in_progress: { bg: "rgba(58,110,165,.14)", fg: "#2F5C8F" },
  finalized: { bg: "rgba(15,138,106,.14)", fg: "var(--emerald-dark,#0F8A6A)" },
};

export function ExportSetDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const router = useRouter();
  const { qty, qtyUnit } = useI18n();
  const [s, setS] = useState<SetDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editSrc, setEditSrc] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [src, setSrc] = useState({ truckRegSnapshot: "", trailerReg: "", destination: "" });

  async function load() { const r = await fetch(`/api/logistics/export-sets/${id}`); if (r.ok) setS(await r.json()); }
  useEffect(() => { load(); }, [id]);
  if (!s) return null;
  const isSeller = (s.viewerRole ?? "seller") === "seller";
  const manage = canManage && isSeller; // купувачът (MK) вижда read-only

  async function generate(force = false) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-sets/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (r.ok && j.skipped?.length) setMsg(t("logistics.export.regenWarn", { list: j.skipped.map((x: string) => t(`logistics.export.${DOC_LABEL[x] ?? "docInvoice"}`)).join(", ") }));
    else if (r.ok) setMsg(`✅ ${t("logistics.export.saved")}`);
    load();
  }

  function openEdit() {
    setSrc({ truckRegSnapshot: s?.truckRegSnapshot ?? "", trailerReg: s?.trailerReg ?? "", destination: s?.destination ?? "" });
    setEditSrc(true); setMsg("");
  }
  async function saveSrc() {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-sets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ truckRegSnapshot: src.truckRegSnapshot || null, trailerReg: src.trailerReg || null, destination: src.destination || null }),
    });
    setBusy(false); setEditSrc(false);
    if (r.ok) { setMsg(t("logistics.export.sourceSaved")); load(); }
    else { const j = await r.json().catch(() => ({})); setMsg(`⚠️ ${j.error ?? t("logistics.common.err")}`); }
  }

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const docFor = (dtp: string) => s.documents.find((d) => d.docType === dtp);
  const inp = { padding: "5px 8px", fontSize: 12.5, width: "100%" } as const;

  return (
    <div style={{ maxWidth: 940 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/export" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.export.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{s.invoiceNumber}</h1>
        {(() => {
          const ds = deriveExportSetStatus(s.documents);
          const st = STATUS_STYLE[ds];
          const tip = ds === "no_docs" ? t("logistics.export.dstatus.tipNone")
            : t("logistics.export.dstatus.tipCount", { fin: finalizedActiveCount(s.documents), total: ACTIVE_EXPORT_DOC_TYPES.length });
          return <span title={tip} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: st.bg, color: st.fg }}>{t(`logistics.export.dstatus.${ds}`)}</span>;
        })()}
        {!isSeller && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{t("logistics.export.receivedBadge")}</span>}
        {manage && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href={`/dashboard/logistics/export/${s.id}/edit`} className="btn btn-ghost btn-sm">{t("logistics.export.edit")}</Link>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => setShowDelete(true)}>{t("logistics.export.delete")}</button>
          </span>
        )}
      </div>
      {msg && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="glass panel">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("logistics.export.basic")}</h3>
            {manage && !editSrc && <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", fontSize: 11 }} onClick={openEdit}>{t("logistics.export.editSource")}</button>}
          </div>

          {editSrc ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.export.sourceHint")}</div>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.export.truck")}
                <input style={inp} value={src.truckRegSnapshot} onChange={(e) => setSrc({ ...src, truckRegSnapshot: e.target.value })} placeholder="SK6539" /></label>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.export.trailer")}
                <input style={inp} value={src.trailerReg} onChange={(e) => setSrc({ ...src, trailerReg: e.target.value })} placeholder="SK6539AO" /></label>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.export.destination")}
                <input style={inp} value={src.destination} onChange={(e) => setSrc({ ...src, destination: e.target.value })} /></label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveSrc}>{t("logistics.export.save")}</button>
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditSrc(false)}>{t("logistics.common.cancel")}</button>
              </div>
            </div>
          ) : (
            <>
              {[
                [t("logistics.export.invoiceNumber"), s.invoiceNumber],
                [t("logistics.export.seller"), s.sellerName],
                [t("logistics.export.date"), dt(s.invoiceDate)],
                [t("logistics.export.destination"), s.destination],
                [t("logistics.export.truck"), [s.truckRegSnapshot, s.trailerReg].filter(Boolean).join(" / ") || "—"],
                [t("logistics.export.product"), s.productSnapshot],
                [t("logistics.export.quantity"), s.quantity != null ? qtyUnit(s.quantity, s.unit) : "—"],
                [t("logistics.export.buyer"), s.buyerName],
                [t("logistics.export.client"), s.clientName],
                [t("logistics.export.cmrDate"), dt(s.declarationCmrDate)],
                [t("logistics.export.dispatch"), s.dispatchNumber],
              ].map(([l, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                  <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v || "—"}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0" }}>
                <span style={{ color: "var(--muted)" }}>{t("logistics.received.mkInvoice")}</span>
                <span style={{ textAlign: "right" }}>
                  {s.mkInvoice
                    ? <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", alignItems: "baseline" }}>
                        <span style={{ fontWeight: 600 }}>{s.mkInvoice.number}</span>
                        {s.mkInvoice.date && <span style={{ color: "var(--muted)", fontSize: 12 }}>{t("logistics.export.mkIssued", { date: dt(s.mkInvoice.date) })}</span>}
                        {/* Cross-company: минава през canonical open-invoice route (owner-контекст, §13). */}
                        <a href={`/dashboard/logistics/export/${s.id}/open-invoice`} style={{ fontWeight: 600 }}>{t("logistics.export.mkOpen")} →</a>
                      </span>
                    : <Link href={`/dashboard/documents/new?fromDelivery=${s.id}`} style={{ color: "var(--brick)", fontWeight: 600 }}>{t("logistics.received.stUninvoiced")} →</Link>}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="glass panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("logistics.export.docStatusTitle")}</h3>
            {manage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => generate(false)}>{t("logistics.export.generateAll")}</button>}
          </div>
          {(() => {
            const ds = deriveExportSetStatus(s.documents);
            const st = STATUS_STYLE[ds];
            return (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: st.bg, color: st.fg }}>{t(`logistics.export.dstatus.${ds}`)}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {ds === "no_docs" ? t("logistics.export.dstatus.tipNone") : t("logistics.export.dstatus.tipCount", { fin: finalizedActiveCount(s.documents), total: ACTIVE_EXPORT_DOC_TYPES.length })}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.export.docStatusHelp")}</div>
              </div>
            );
          })()}
          {ACTIVE_EXPORT_DOC_TYPES.map((dtp) => {
            const doc = docFor(dtp);
            const finalized = doc?.status === "finalized";
            const dst = finalized ? STATUS_STYLE.finalized : STATUS_STYLE.draft;
            return (
              <div key={dtp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 0", borderTop: "1px solid rgba(217,215,200,.4)" }}>
                <span style={{ flex: 1, fontSize: 13 }}>{t(`logistics.export.${DOC_LABEL[dtp]}`)}</span>
                {doc ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: dst.bg, color: dst.fg, whiteSpace: "nowrap" }}>
                    {t(`logistics.export.dstatus.${finalized ? "finalized" : "draft"}`)}
                    {doc.overridden && <span style={{ color: "var(--brass)", fontWeight: 600 }}> · {t("logistics.export.overridden")}</span>}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>○ {t("logistics.export.stNot")}</span>
                )}
                {doc && (
                  <>
                    <Link href={`/dashboard/logistics/export/${id}/${dtp}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>
                      {finalized ? t("logistics.export.view") : t("logistics.export.edit")}
                    </Link>
                    <a href={`/dashboard/logistics/export/${id}/${dtp}/print`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>
                      {t("logistics.export.printPdf")}
                    </a>
                  </>
                )}
              </div>
            );
          })}
          {/* Исторически документи, чийто тип вече не е активен (напр. деактивиран CMR EPSON):
              показват се само за преглед/печат на съществуващия документ — БЕЗ генериране и
              БЕЗ да се броят за завършеност (§8/§9). Не се появяват за нови доставки. */}
          {s.documents.filter((d) => !isActiveExportDocType(d.docType) && d.docType !== "blank").map((doc) => {
            const finalized = doc.status === "finalized";
            return (
              <div key={doc.docType} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 0", borderTop: "1px solid rgba(217,215,200,.4)", opacity: 0.75 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{t(`logistics.export.${DOC_LABEL[doc.docType] ?? "docInvoice"}`)} <span style={{ fontSize: 11, color: "var(--muted)" }}>· {t("logistics.export.historicalDoc")}</span></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: finalized ? "var(--emerald-dark,#0F8A6A)" : "var(--muted)" }}>
                  {finalized ? `✓ ${t("logistics.export.stReady")}` : `● ${t("logistics.export.stGenerated")}`}
                </span>
                <Link href={`/dashboard/logistics/export/${id}/${doc.docType}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>
                  {finalized ? t("logistics.export.view") : t("logistics.export.edit")}
                </Link>
                <a href={`/dashboard/logistics/export/${id}/${doc.docType}/print`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>
                  {t("logistics.export.printPdf")}
                </a>
              </div>
            );
          })}
          {manage && s.documents.some((d) => d.overridden && isActiveExportDocType(d.docType)) && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => generate(true)}>{t("logistics.export.regenerate")}</button>
          )}
        </div>
      </div>

      {showDelete && (
        <ExportDeleteModal
          set={{ id: s.id, invoiceNumber: s.invoiceNumber, invoiceDate: s.invoiceDate, clientName: s.clientName ?? s.buyerName, truckRegSnapshot: s.truckRegSnapshot, trailerReg: s.trailerReg, productSnapshot: s.productSnapshot, quantity: s.quantity, unit: s.unit }}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push("/dashboard/logistics/export")}
        />
      )}

      {/* Досие: допълнителни документи + свързани записи + хронология (§7/§20/§53). */}
      <ExportDossierExtras id={s.id} canManage={manage} truckVehicleId={s.truckVehicleId}
        mkInvoice={s.mkInvoice ?? null} receivedBy={!isSeller ? s.buyerName : (s.buyerName ?? null)} />
    </div>
  );
}
