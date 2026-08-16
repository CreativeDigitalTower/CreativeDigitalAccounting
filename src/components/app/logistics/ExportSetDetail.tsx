"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { EXPORT_DOC_TYPES } from "@/lib/logistics/config";

type Doc = { id: string; docType: string; status: string; overridden: boolean; updatedAt: string };
type SetDto = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; declarationCmrDate: string | null; dispatchNumber: string | null;
  status: string; documents: Doc[];
};
const DOC_LABEL: Record<string, string> = { invoice: "docInvoice", dispatch: "docDispatch", blank: "docBlank", declaration: "docDeclaration", cmr_epson: "docCmrEpson", cmr_hp: "docCmrHp" };
const EDITABLE = new Set(["invoice", "dispatch", "blank"]); // PR2 документи с редактор/печат

export function ExportSetDetail({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const [s, setS] = useState<SetDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const r = await fetch(`/api/logistics/export-sets/${id}`); if (r.ok) setS(await r.json()); }
  useEffect(() => { load(); }, [id]);
  if (!s) return null;

  async function generate(force = false) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-sets/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (r.ok && j.skipped?.length) setMsg(t("logistics.export.regenWarn", { list: j.skipped.map((x: string) => t(`logistics.export.${DOC_LABEL[x]}`)).join(", ") }));
    else if (r.ok) setMsg("");
    load();
  }

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const docFor = (dtp: string) => s.documents.find((d) => d.docType === dtp);
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
      <span style={{ color: "var(--muted)" }}>{l}</span><span style={{ textAlign: "right" }}>{v ?? "—"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/export" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.export.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{s.invoiceNumber}</h1>
      </div>
      {msg && <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{t("logistics.export.basic")}</h3>
          <Row l={t("logistics.export.invoiceNumber")} v={s.invoiceNumber} />
          <Row l={t("logistics.export.date")} v={dt(s.invoiceDate)} />
          <Row l={t("logistics.export.destination")} v={s.destination} />
          <Row l={t("logistics.export.truck")} v={[s.truckRegSnapshot, s.trailerReg].filter(Boolean).join(" / ") || "—"} />
          <Row l={t("logistics.export.product")} v={s.productSnapshot} />
          <Row l={t("logistics.export.quantity")} v={s.quantity != null ? `${s.quantity} ${s.unit}` : "—"} />
          <Row l={t("logistics.export.cmrDate")} v={dt(s.declarationCmrDate)} />
          <Row l={t("logistics.export.dispatch")} v={s.dispatchNumber} />
        </div>

        <div className="glass panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("logistics.export.documents")}</h3>
            {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => generate(false)}>{t("logistics.export.generateAll")}</button>}
          </div>
          {EXPORT_DOC_TYPES.map((dtp) => {
            const doc = docFor(dtp);
            return (
              <div key={dtp} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid rgba(217,215,200,.4)" }}>
                <span style={{ flex: 1, fontSize: 13 }}>{t(`logistics.export.${DOC_LABEL[dtp]}`)}</span>
                {doc ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald-dark,#0F8A6A)" }}>✓ {t("logistics.export.stGenerated")}{doc.overridden && <span style={{ color: "var(--brass)" }}> · {t("logistics.export.overridden")}</span>}</span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>○ {t("logistics.export.stNot")}</span>
                )}
                {doc && EDITABLE.has(dtp) && (
                  <Link href={`/dashboard/logistics/export/${id}/${dtp}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.export.open")}</Link>
                )}
              </div>
            );
          })}
          {canManage && s.documents.some((d) => d.overridden) && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => generate(true)}>{t("logistics.export.regenerate")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
