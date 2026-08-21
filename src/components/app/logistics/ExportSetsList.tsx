"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";

type DocLite = { docType: string; status: string; overridden: boolean };
type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; buyer: string | null; documents: DocLite[];
};

const ACTIVE_TOTAL = ACTIVE_EXPORT_DOC_TYPES.length; // 5

export function ExportSetsList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [dest, setDest] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { fetch("/api/logistics/export-sets").then((r) => r.ok ? r.json() : []).then(setRows); }, []);

  const destinations = useMemo(() => [...new Set(rows.map((r) => r.destination).filter(Boolean) as string[])].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (dest && r.destination !== dest) return false;
    if (status && r.status !== status) return false;
    if (q) {
      const hay = `${r.invoiceNumber} ${r.destination ?? ""} ${r.truckRegSnapshot ?? ""} ${r.trailerReg ?? ""} ${r.productSnapshot ?? ""} ${r.buyer ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, dest, status]);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const activeDocs = (docs: DocLite[]) => docs.filter((d) => isActiveExportDocType(d.docType)).length;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "5px 8px", fontSize: 12.5 } as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.title")}</h1>
        {canManage && <Link href="/dashboard/logistics/export/new" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{t("logistics.export.add")}</Link>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...sel, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.export.search")} />
        <select style={sel} value={dest} onChange={(e) => setDest(e.target.value)}>
          <option value="">{t("logistics.export.allDestinations")}</option>
          {destinations.map((dv) => <option key={dv} value={dv}>{dv}</option>)}
        </select>
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("logistics.export.allStatuses")}</option>
          <option value="draft">{t("logistics.export.stDraft")}</option>
          <option value="finalized">{t("logistics.export.stReady")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.export.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.export.invoiceNumber")}</th><th style={th}>{t("logistics.export.date")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.export.product")}</th><th style={th}>{t("logistics.export.quantity")}</th>
              <th style={th}>{t("logistics.export.buyer")}</th><th style={th}>{t("logistics.export.status")}</th><th style={th}>{t("logistics.export.documents")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link></td>
                  <td style={td}>{dt(r.invoiceDate)}</td><td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{r.productSnapshot ?? "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? qtyUnit(r.quantity, r.unit) : "—"}</td>
                  <td style={td}>{r.buyer ?? "—"}</td>
                  <td style={td}>{r.status === "finalized" ? t("logistics.export.stReady") : t("logistics.export.stDraft")}</td>
                  <td style={td} className="num">{activeDocs(r.documents)}/{ACTIVE_TOTAL}</td>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.open")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
