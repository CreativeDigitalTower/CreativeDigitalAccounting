"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";

type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; seller: string | null; documents: { docType: string }[];
};
const ACTIVE_TOTAL = ACTIVE_EXPORT_DOC_TYPES.length;

export function ExportReceivedList() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch("/api/logistics/export-sets/received").then((r) => r.ok ? r.json() : []).then(setRows); }, []);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const active = (docs: { docType: string }[]) => docs.filter((d) => isActiveExportDocType(d.docType)).length;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.receivedTitle")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("logistics.export.receivedIntro")}</p>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.export.receivedEmpty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.export.invoiceNumber")}</th><th style={th}>{t("logistics.export.date")}</th>
              <th style={th}>{t("logistics.export.seller")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.export.quantity")}</th>
              <th style={th}>{t("logistics.export.status")}</th><th style={th}>{t("logistics.export.documents")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link></td>
                  <td style={td}>{dt(r.invoiceDate)}</td><td style={td}>{r.seller ?? "—"}</td><td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? `${r.quantity} ${r.unit}` : "—"}</td>
                  <td style={td}>{r.status === "finalized" ? t("logistics.export.stReady") : t("logistics.export.stDraft")}</td>
                  <td style={td} className="num">{active(r.documents)}/{ACTIVE_TOTAL}</td>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.view")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
