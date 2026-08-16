"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { ExportInvoiceTemplate, type InvoiceDocData } from "@/components/app/logistics/ExportInvoiceTemplate";
import { ExportDispatchTemplate, type DispatchDocData } from "@/components/app/logistics/ExportDispatchTemplate";
import { ExportDeclarationTemplate, type DeclarationDocData } from "@/components/app/logistics/ExportDeclarationTemplate";
import { ExportCmrTemplate, type CmrDocData } from "@/components/app/logistics/ExportCmrTemplate";

type Doc = { id: string; docType: string; data: Record<string, unknown>; overridden: boolean; status: string };

// helper за задаване по път „a.b.0.c"
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split("."); const root = structuredClone(obj);
  let cur: Record<string, unknown> = root as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]; const nk = keys[i + 1]; const arrIdx = /^\d+$/.test(nk);
    if (cur[k] == null) cur[k] = arrIdx ? [] : {};
    cur = cur[k] as Record<string, unknown>;
  }
  (cur as Record<string, unknown>)[keys[keys.length - 1]] = value;
  return root;
}
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

const INP: React.CSSProperties = { padding: "5px 8px", fontSize: 12.5, width: "100%" };
const LBL: React.CSSProperties = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 };

// ВАЖНО: тези компоненти са дефинирани на модулно ниво (НЕ вътре в ExportDocEditor).
// Ако бяха вътре, всяко натискане на клавиш пресъздаваше типа на компонента и React
// remount-ваше input-а → загуба на focus и „refresh" при ръчно въвеждане на дата. (bug #1/#2)
type FieldProps = { label: string; value: string; type?: string; disabled?: boolean; onChange: (v: string) => void };
function Field({ label, value, type = "text", disabled, onChange }: FieldProps) {
  return (
    <div><label style={LBL}>{label}</label>
      <input type={type} disabled={disabled} style={INP}
        value={type === "date" ? (value ?? "").slice(0, 10) : (value ?? "")}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Area({ label, value, disabled, onChange }: FieldProps) {
  return (
    <div><label style={LBL}>{label}</label>
      <textarea disabled={disabled} style={{ ...INP, minHeight: 96, resize: "vertical", fontFamily: "inherit" }}
        value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ExportDocEditor({ setId, docId, canManage }: { setId: string; docId: string; canManage: boolean }) {
  const t = useT();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() { const r = await fetch(`/api/logistics/export-documents/${docId}`); if (r.ok) { const j = await r.json(); setDoc(j); setData(j.data ?? {}); } }
  useEffect(() => { load(); }, [docId]);
  if (!doc) return null;

  const finalized = doc.status === "finalized";
  const set = (path: string, value: unknown) => setData((d) => setPath(d, path, value));
  const str = (path: string) => { const v = getPath(data, path); return v == null ? "" : String(v); };
  const setNum = (path: string, v: string) => set(path, v === "" ? null : Number(v));

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-documents/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, ...extra }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(`⚠️ ${j.error ?? t("logistics.common.err")}`); return; }
    setMsg(`✅ ${t("logistics.export.saved")}`); load();
  }
  async function action(body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-documents/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false); if (r.ok) load();
  }

  // Стабилни helper-и за полетата (identity на onChange е без значение — важен е типът).
  const txt = (label: string, path: string) => <Field label={label} value={str(path)} disabled={finalized} onChange={(v) => set(path, v)} />;
  const date = (label: string, path: string) => <Field label={label} value={str(path)} type="date" disabled={finalized} onChange={(v) => set(path, v)} />;
  const number = (label: string, path: string) => <Field label={label} value={str(path)} type="number" disabled={finalized} onChange={(v) => setNum(path, v)} />;
  const area = (label: string, path: string) => <Area label={label} value={str(path)} disabled={finalized} onChange={(v) => set(path, v)} />;

  const dt = doc.docType;
  const isInvoice = dt === "invoice";
  const isBlank = dt === "blank";
  const isDispatchLike = dt === "dispatch" || dt === "blank";
  const isDeclaration = dt === "declaration";
  const printUrl = `/dashboard/logistics/export/${setId}/${doc.docType}/print`;

  return (
    <div style={{ maxWidth: 1120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`/dashboard/logistics/export/${setId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.export.documents")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{t(`logistics.export.doc${doc.docType.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}`)}</h1>
        {finalized && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--emerald-dark,#0F8A6A)", color: "#fff", borderRadius: 10, padding: "2px 8px" }}>{t("logistics.export.stReady")}</span>}
        {doc.overridden && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)" }}>{t("logistics.export.overridden")}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a className="btn btn-ghost btn-sm" href={printUrl} target="_blank" rel="noreferrer">{t("logistics.export.printPdf")}</a>
          {canManage && !finalized && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => save()}>{t("logistics.export.save")}</button>}
          {canManage && !finalized && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => action({ finalize: true })}>{t("logistics.export.finalize")}</button>}
          {canManage && finalized && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => action({ reopen: true })}>{t("logistics.export.reopen")}</button>}
        </div>
      </div>
      {finalized && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("logistics.export.finalizedHint")}</div>}
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        {/* Editable fields */}
        <div className="glass panel" style={{ display: "grid", gap: 8 }}>
          {isInvoice ? (
            <>
              {txt(t("logistics.export.invoiceNumber"), "invoiceNumber")}
              {date(t("logistics.export.date"), "invoiceDate")}
              {txt("Seller", "seller.name")}
              {txt("Buyer", "buyer.name")}
              {txt("Terms of delivery", "termsOfDelivery")}
              {txt(t("logistics.export.truck"), "truck")}
              {txt("Place of shipment", "placeOfShipment")}
              {txt(t("logistics.export.destination"), "destination")}
              {txt("Description", "goods.0.description")}
              {number(t("logistics.export.quantity"), "goods.0.quantity")}
              {number("Unit price (EUR)", "goods.0.unitPrice")}
              {number("VAT %", "vatRate")}
              {txt("Payment conditions", "paymentConditions")}
            </>
          ) : isDispatchLike ? (
            <>
              {txt(t("logistics.export.dispatch"), "dispatchNumber")}
              {date(t("logistics.export.date"), "date")}
              {txt(t("logistics.export.issuer"), "issuer.name")}
              {!isBlank && <>{txt(t("logistics.export.client"), "recipient.name")}{txt(t("logistics.export.address"), "recipient.address")}</>}
              {txt(t("logistics.export.truck"), "rows.0.truck")}
              {txt(t("logistics.export.material"), "rows.0.material")}
              {number(t("logistics.export.quantity"), "rows.0.quantity")}
            </>
          ) : isDeclaration ? (
            <>
              {txt(t("logistics.export.declarant"), "declarantName")}
              {txt(t("logistics.export.invoiceNumber"), "invoiceNumber")}
              {date(t("logistics.export.date"), "invoiceDate")}
              {txt(t("logistics.export.product"), "product")}
              {txt(t("logistics.export.origin"), "origin")}
              {txt(t("logistics.export.proformaNo"), "proformaNumber")}
              {txt(t("logistics.export.place"), "place")}
              {date(t("logistics.export.date"), "date")}
              {area(t("logistics.export.declBody"), "bodyText")}
              {area(t("logistics.export.declStatement"), "statementText")}
            </>
          ) : (
            <>
              {txt(t("logistics.export.sender"), "sender.name")}
              {txt(t("logistics.export.consignee"), "consignee.name")}
              {txt(t("logistics.export.destination"), "destination")}
              {txt(t("logistics.export.placeOfLoading"), "placeOfShipment")}
              {date(t("logistics.export.date"), "date")}
              {txt(t("logistics.export.truck"), "truck")}
              {txt(t("logistics.export.invoiceNumber"), "invoiceNumber")}
              {txt(t("logistics.export.goodsDesc"), "goods.description")}
              {txt(t("logistics.export.customsCode"), "goods.customsCode")}
              {number(t("logistics.export.grossKg"), "weightKg")}
              {txt(t("logistics.export.carrier"), "carrier")}
            </>
          )}
        </div>

        {/* Live preview */}
        <div style={{ overflowX: "auto", background: "#f4f2ea", padding: 12, borderRadius: 10 }}>
          {isInvoice ? <ExportInvoiceTemplate data={data as InvoiceDocData} />
            : isDispatchLike ? <ExportDispatchTemplate data={data as DispatchDocData} blank={isBlank} />
            : isDeclaration ? <ExportDeclarationTemplate data={data as DeclarationDocData} />
            : <ExportCmrTemplate data={data as CmrDocData} />}
        </div>
      </div>
    </div>
  );
}
