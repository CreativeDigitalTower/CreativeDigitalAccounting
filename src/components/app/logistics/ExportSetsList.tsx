"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Row = { id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null; truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null; quantity: number | null; unit: string; status: string; documents: { docType: string }[] };

export function ExportSetsList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch("/api/logistics/export-sets").then((r) => r.ok ? r.json() : []).then(setRows); }, []);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.title")}</h1>
        {canManage && <Link href="/dashboard/logistics/export/new" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{t("logistics.export.add")}</Link>}
      </div>
      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.export.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.export.invoiceNumber")}</th><th style={th}>{t("logistics.export.date")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.export.product")}</th><th style={th}>{t("logistics.export.quantity")}</th><th style={th}>{t("logistics.export.documents")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link></td>
                  <td style={td}>{dt(r.invoiceDate)}</td><td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{r.productSnapshot ?? "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? `${r.quantity} ${r.unit}` : "—"}</td>
                  <td style={td} className="num">{r.documents.length}/6</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
