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
  const num = (v: string) => v === "" ? null : Number(v);

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-documents/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, ...extra }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(`⚠️ ${j.error ?? "Грешка."}`); return; }
    setMsg("✅ Запазено."); load();
  }
  async function action(body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/logistics/export-documents/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false); if (r.ok) load();
  }

  const inp = { padding: "5px 8px", fontSize: 12.5, width: "100%" } as const;
  const lbl = { fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 2 } as const;
  const Field = ({ label, path, type = "text" }: { label: string; path: string; type?: string }) => (
    <div><label style={lbl}>{label}</label>
      <input type={type} disabled={finalized} style={inp}
        value={type === "date" ? String(getPath(data, path) ?? "").slice(0, 10) : String(getPath(data, path) ?? "")}
        onChange={(e) => set(path, type === "number" ? num(e.target.value) : e.target.value)} />
    </div>
  );

  const Area = ({ label, path }: { label: string; path: string }) => (
    <div><label style={lbl}>{label}</label>
      <textarea disabled={finalized} style={{ ...inp, minHeight: 96, resize: "vertical", fontFamily: "inherit" }}
        value={String(getPath(data, path) ?? "")}
        onChange={(e) => set(path, e.target.value)} />
    </div>
  );

  const dt = doc.docType;
  const isInvoice = dt === "invoice";
  const isBlank = dt === "blank";
  const isDispatchLike = dt === "dispatch" || dt === "blank";
  const isDeclaration = dt === "declaration";
  const isCmr = dt === "cmr_epson" || dt === "cmr_hp";
  const printUrl = `/dashboard/logistics/export/${setId}/${doc.docType}/print`;

  return (
    <div style={{ maxWidth: 1120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href={`/dashboard/logistics/export/${setId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.export.documents")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{t(`logistics.export.doc${doc.docType.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}`)}</h1>
        {finalized && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--emerald-dark,#0F8A6A)", color: "#fff", borderRadius: 10, padding: "2px 8px" }}>{t("logistics.export.stReady")}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a className="btn btn-ghost btn-sm" href={printUrl} target="_blank" rel="noreferrer">{t("logistics.export.printPdf")}</a>
          {canManage && !finalized && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => save()}>{t("logistics.export.save")}</button>}
          {canManage && !finalized && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => action({ finalize: true })}>{t("logistics.export.finalize")}</button>}
          {canManage && finalized && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => action({ reopen: true })}>{t("logistics.export.reopen")}</button>}
        </div>
      </div>
      {msg && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        {/* Editable fields */}
        <div className="glass panel" style={{ display: "grid", gap: 8 }}>
          {isInvoice ? (
            <>
              <Field label={t("logistics.export.invoiceNumber")} path="invoiceNumber" />
              <Field label={t("logistics.export.date")} path="invoiceDate" type="date" />
              <Field label="Seller" path="seller.name" />
              <Field label="Buyer" path="buyer.name" />
              <Field label="Terms of delivery" path="termsOfDelivery" />
              <Field label={t("logistics.export.truck")} path="truck" />
              <Field label="Place of shipment" path="placeOfShipment" />
              <Field label={t("logistics.export.destination")} path="destination" />
              <Field label="Description" path="goods.0.description" />
              <Field label={t("logistics.export.quantity")} path="goods.0.quantity" type="number" />
              <Field label="Unit price (EUR)" path="goods.0.unitPrice" type="number" />
              <Field label="VAT %" path="vatRate" type="number" />
              <Field label="Payment conditions" path="paymentConditions" />
            </>
          ) : isDispatchLike ? (
            <>
              <Field label={t("logistics.export.dispatch")} path="dispatchNumber" />
              <Field label={t("logistics.export.date")} path="date" type="date" />
              <Field label="Издател (issuer)" path="issuer.name" />
              {!isBlank && <><Field label={t("logistics.export.client")} path="recipient.name" /><Field label="Адрес" path="recipient.address" /></>}
              <Field label={t("logistics.export.truck")} path="rows.0.truck" />
              <Field label="Материал" path="rows.0.material" />
              <Field label={t("logistics.export.quantity")} path="rows.0.quantity" type="number" />
            </>
          ) : isDeclaration ? (
            <>
              <Field label="Декларатор" path="declarantName" />
              <Field label={t("logistics.export.invoiceNumber")} path="invoiceNumber" />
              <Field label={t("logistics.export.date")} path="invoiceDate" type="date" />
              <Field label={t("logistics.export.product")} path="product" />
              <Field label="Произход" path="origin" />
              <Field label="Проформа №" path="proformaNumber" />
              <Field label="Място" path="place" />
              <Field label={t("logistics.export.date")} path="date" type="date" />
              <Area label="Текст на декларацията" path="bodyText" />
            </>
          ) : (
            <>
              <Field label="Изпращач (sender)" path="sender.name" />
              <Field label="Получател (consignee)" path="consignee.name" />
              <Field label={t("logistics.export.destination")} path="destination" />
              <Field label="Място на натоварване" path="placeOfShipment" />
              <Field label={t("logistics.export.date")} path="date" type="date" />
              <Field label={t("logistics.export.truck")} path="truck" />
              <Field label={t("logistics.export.invoiceNumber")} path="invoiceNumber" />
              <Field label="Описание на стоката" path="goods.description" />
              <Field label="Митнически код" path="goods.customsCode" />
              <Field label="Бруто тегло (kg)" path="weightKg" type="number" />
              <Field label="Превозвач" path="carrier" />
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
