"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ExportDossierExtras } from "@/components/app/logistics/ExportDossierExtras";
import { ACTIVE_EXPORT_DOC_TYPES } from "@/lib/logistics/config";

type Mk = { id: string; number: string; kind: "document" | "mk" } | null;
type Delivery = {
  id: string; invoiceNumber: string; invoiceDate: string | null; shipmentDate: string | null; dispatchNumber: string | null;
  trailerReg: string | null; truckRegSnapshot: string | null; destination: string | null; deliveryTerm: string | null; placeOfShipment: string | null;
  productSnapshot: string | null; quantity: number | null; unit: string; status: string; deletedAt: string | null; client: string | null;
  documents: { docType: string }[]; generatedDocumentCount: number; attachmentCount: number; mkInvoice: Mk;
};
type Kpi = { total: number; thisMonth: number; totalQuantity: number; lastDelivery: string | null; generatedDocuments: number; totalDocuments: number; attachments: number };

const YEARS = (() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2, y - 3, y - 4]; })();
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const GEN_TOTAL = ACTIVE_EXPORT_DOC_TYPES.length;

export function VehicleDeliveryHistory({ vehicleId, canManage, canDeleted }: { vehicleId: string; canManage: boolean; canDeleted?: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [year, setYear] = useState(""); const [month, setMonth] = useState("");
  const [product, setProduct] = useState(""); const [destination, setDestination] = useState(""); const [status, setStatus] = useState("");
  const [hasAtt, setHasAtt] = useState(""); const [showDeleted, setShowDeleted] = useState(false);
  const pageSize = 20;

  function load() {
    const p = new URLSearchParams({ page: String(page) });
    if (q) p.set("q", q);
    if (year) p.set("year", year);
    if (year && month) p.set("month", String(Number(month) - 1));
    if (product) p.set("product", product);
    if (destination) p.set("destination", destination);
    if (status) p.set("status", status);
    if (hasAtt) p.set("hasAttachments", hasAtt);
    if (showDeleted) p.set("includeDeleted", "1");
    fetch(`/api/logistics/vehicles/${vehicleId}/deliveries?${p.toString()}`).then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j) { setRows(j.rows ?? []); setKpi(j.kpi ?? null); setTotal(j.total ?? 0); } });
  }
  useEffect(() => { setPage(1); }, [q, year, month, product, destination, status, hasAtt, showDeleted]);
  useEffect(() => { load(); }, [vehicleId, q, year, month, product, destination, status, hasAtt, showDeleted, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };
  const sel = { padding: "5px 8px", fontSize: 12.5 } as const;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const mkHref = (mk: NonNullable<Mk>) => mk.kind === "mk" ? `/dashboard/logistics/mk-sales/${mk.id}` : `/dashboard/documents/${mk.id}`;

  function Kpi({ label, value }: { label: string; value: string }) {
    return <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div><div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{value}</div></div>;
  }

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 10px" }}>{t("logistics.dossier.deliveryHistory")}</h3>

      {kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 12 }}>
          <Kpi label={t("logistics.export.kpiTotal")} value={String(kpi.total)} />
          <Kpi label={t("logistics.export.kpiMonth")} value={String(kpi.thisMonth)} />
          <Kpi label={t("logistics.export.kpiQuantity")} value={qtyUnit(kpi.totalQuantity, "t")} />
          <Kpi label={t("logistics.dossier.lastDelivery")} value={dt(kpi.lastDelivery)} />
          <Kpi label={t("logistics.dossier.totalDocs")} value={`${kpi.totalDocuments}`} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input style={{ ...sel, minWidth: 180 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.export.search")} />
        <select style={sel} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">{t("logistics.export.allYears")}</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={sel} value={month} onChange={(e) => setMonth(e.target.value)} disabled={!year}>
          <option value="">{t("logistics.export.allMonths")}</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input style={{ ...sel, width: 130 }} value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("logistics.export.product")} />
        <input style={{ ...sel, width: 120 }} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t("logistics.export.destination")} />
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("logistics.export.allStatuses")}</option>
          <option value="draft">{t("logistics.export.stDraft")}</option>
          <option value="finalized">{t("logistics.export.stReady")}</option>
        </select>
        <select style={sel} value={hasAtt} onChange={(e) => setHasAtt(e.target.value)}>
          <option value="">{t("logistics.export.anyDocs")}</option>
          <option value="1">{t("logistics.export.withDocs")}</option>
          <option value="0">{t("logistics.export.noDocs")}</option>
        </select>
        {canDeleted && <label style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />{t("logistics.dossier.showDeleted")}
        </label>}
      </div>

      {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.dossier.noDeliveries")}</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th} /><th style={th}>{t("logistics.export.date")}</th><th style={th}>{t("logistics.export.invoiceNumber")}</th>
              <th style={th}>{t("logistics.dossier.dispatchNo")}</th><th style={th}>{t("logistics.export.trailer")}</th>
              <th style={th}>{t("logistics.export.product")}</th><th style={th}>{t("logistics.export.quantity")}</th>
              <th style={th}>{t("logistics.export.client")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.documents")}</th><th style={th}>{t("logistics.received.mkInvoice")}</th><th style={th}>{t("logistics.export.status")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <RowBlock key={r.id} r={r} expanded={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  canManage={canManage} dt={dt} td={td} qtyUnit={qtyUnit} mkHref={mkHref} onChanged={load} genTotal={GEN_TOTAL} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{page} / {pages} · {total}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}

const DOC_LABELS: Record<string, string> = { invoice: "docInvoice", dispatch: "docDispatch", declaration: "docDeclaration", cmr_epson: "docCmrEpson", cmr_hp: "docCmrHp" };

function RowBlock({ r, expanded, onToggle, canManage, dt, td, qtyUnit, mkHref, onChanged, genTotal }: {
  r: Delivery; expanded: boolean; onToggle: () => void; canManage: boolean;
  dt: (x: string | null) => string; td: React.CSSProperties; qtyUnit: (v: number | null | undefined, u: string) => string;
  mkHref: (mk: NonNullable<Mk>) => string; onChanged: () => void; genTotal: number;
}) {
  const t = useT();
  const genDocs = r.documents.filter((d) => ["invoice", "dispatch", "declaration", "cmr_hp", "cmr_epson"].includes(d.docType));
  const lbl = { fontSize: 11, color: "var(--muted)" } as const;
  return (
    <>
      <tr style={{ opacity: r.deletedAt ? 0.5 : 1, cursor: "pointer" }} onClick={onToggle}>
        <td style={{ ...td, width: 22 }}>{expanded ? "▾" : "▸"}</td>
        <td style={td}>{dt(r.shipmentDate ?? r.invoiceDate)}</td>
        <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link></td>
        <td style={td} className="num">{r.dispatchNumber ?? "—"}</td>
        <td style={td} className="num">{r.trailerReg ?? "—"}</td>
        <td style={td}>{r.productSnapshot ?? "—"}</td>
        <td style={td} className="num">{r.quantity != null ? qtyUnit(r.quantity, r.unit) : "—"}</td>
        <td style={td}>{r.client ?? "—"}</td>
        <td style={td}>{r.destination ?? "—"}</td>
        <td style={td} className="num" title={t("logistics.export.docsBreakdown", { gen: r.generatedDocumentCount, att: r.attachmentCount })}>
          {r.generatedDocumentCount}/{genTotal}{r.attachmentCount > 0 ? <span style={{ color: "var(--brass)" }}> +{r.attachmentCount}</span> : null}
        </td>
        <td style={td}>{r.mkInvoice ? <Link href={mkHref(r.mkInvoice)} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>{r.mkInvoice.number}</Link> : "—"}</td>
        <td style={td}>{r.status === "finalized" ? t("logistics.export.stReady") : t("logistics.export.stDraft")}</td>
        <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.export.open")}</Link></td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={13} style={{ padding: "10px 14px", background: "rgba(0,0,0,.02)", borderTop: "1px solid rgba(217,215,200,.5)" }}>
            {/* Основни данни (§16) — исторически snapshot от доставката (§28/§29). */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 6, marginBottom: 12, fontSize: 12.5 }}>
              <div><span style={lbl}>{t("logistics.export.issueDate")}: </span>{dt(r.invoiceDate)}</div>
              <div><span style={lbl}>{t("logistics.export.shipmentDate")}: </span>{dt(r.shipmentDate)}</div>
              <div><span style={lbl}>{t("logistics.export.deliveryTerm")}: </span>{r.deliveryTerm ?? "—"}</div>
              <div><span style={lbl}>{t("logistics.export.placeOfShipment")}: </span>{r.placeOfShipment ?? "—"}</div>
              <div><span style={lbl}>{t("logistics.export.truck")}: </span>{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</div>
            </div>

            {/* Генерирани документи (§17) */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t("logistics.export.documents")}</div>
              {genDocs.length === 0 ? <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {genDocs.map((d) => (
                    <div key={d.docType} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ minWidth: 110 }}>{t(`logistics.export.${DOC_LABELS[d.docType] ?? "docInvoice"}`)}</span>
                      <Link href={`/dashboard/logistics/export/${r.id}/${d.docType}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.export.open")}</Link>
                      <a href={`/dashboard/logistics/export/${r.id}/${d.docType}/print`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}>{t("logistics.export.printPdf")}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Допълнителни документи + свързани + хронология — reuse от PR #191 (§18-§22). */}
            <ExportDossierExtras id={r.id} canManage={canManage && !r.deletedAt} mkInvoice={r.mkInvoice ? { id: r.mkInvoice.id, number: r.mkInvoice.number } : null} onChanged={onChanged} />
          </td>
        </tr>
      )}
    </>
  );
}
