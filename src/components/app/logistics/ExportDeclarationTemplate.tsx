"use client";
import { companyIdentifier } from "@/lib/company/identifier";
import { DECLARATION_STATEMENT } from "@/lib/logistics/exportDocs";

type Party = { name?: string | null; address?: string | null; city?: string | null; country?: string | null; eik?: string | null; registrationNumber?: string | null; vatNumber?: string | null };
export type DeclarationDocData = {
  regulation?: string | null; title?: string | null;
  declarantName?: string | null; bgCompany?: Party;
  proformaNumber?: string | null; proformaDate?: string | null; holcim?: string | null;
  invoiceNumber?: string | null; invoiceDate?: string | null; product?: string | null;
  origin?: string | null; place?: string | null; date?: string | null; bodyText?: string | null;
  statementText?: string | null;
};

const d = (s?: string | null) => s ? new Date(s).toLocaleDateString("bg-BG") : "";
function idText(p?: Party) { if (!p) return ""; const id = companyIdentifier(p); return id ? `${id.kind === "eik" ? "ЕИК" : "Reg.No"} ${id.value}` : ""; }

export function ExportDeclarationTemplate({ data }: { data: DeclarationDocData }) {
  return (
    <div className="printable" style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", width: 720, margin: "0 auto", padding: 28, fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ textAlign: "right", fontSize: 11, marginBottom: 18 }}>{data.regulation ?? ""}</div>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, letterSpacing: 1, marginBottom: 20 }}>{data.title ?? "ДЕКЛАРАЦИЯ"}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{data.bgCompany?.name ?? data.declarantName ?? ""}</div>
        <div>{data.bgCompany?.address}{data.bgCompany?.city ? `, ${data.bgCompany.city}` : ""}</div>
        <div>{idText(data.bgCompany)}{data.bgCompany?.vatNumber ? ` · ДДС ${data.bgCompany.vatNumber}` : ""}</div>
      </div>

      <p style={{ textAlign: "justify", marginBottom: 12 }}>{data.bodyText ?? ""}</p>
      {/* Задължителен нормативен текст (fallback към константата за стари snapshots). */}
      <p style={{ textAlign: "justify", marginBottom: 16, whiteSpace: "pre-line" }}>{data.statementText ?? DECLARATION_STATEMENT}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 24 }}>
        <div>Фактура №: <b>{data.invoiceNumber ?? ""}</b></div>
        <div>Дата: <b>{d(data.invoiceDate)}</b></div>
        <div>Стока: <b>{data.product ?? ""}</b></div>
        <div>Произход: <b>{data.origin ?? ""}</b></div>
        {(data.proformaNumber || data.holcim) && <div style={{ gridColumn: "1 / -1" }}>Проформа {data.holcim ?? ""}: <b>{data.proformaNumber ?? ""}</b>{data.proformaDate ? ` / ${d(data.proformaDate)}` : ""}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <div>Място/Дата: <b>{[data.place, d(data.date)].filter(Boolean).join(", ")}</b></div>
        <div style={{ textAlign: "center" }}>Декларатор: ______________<br /><span style={{ fontSize: 11 }}>/ подпис и печат /</span></div>
      </div>
    </div>
  );
}
