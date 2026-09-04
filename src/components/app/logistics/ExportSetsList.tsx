"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";
import { ExportDeleteModal, type DeletableSet } from "@/components/app/logistics/ExportDeleteModal";

type DocLite = { docType: string; status: string; overridden: boolean };
type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; buyer: string | null; documents: DocLite[]; attachmentCount: number;
};
type Kpi = { total: number; thisMonth: number; totalQuantity: number; withAttachments: number; withoutAttachments: number };

const ACTIVE_TOTAL = ACTIVE_EXPORT_DOC_TYPES.length;
const YEARS = (() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2, y - 3]; })();
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export function ExportSetsList({ canManage, canCreate = canManage }: { canManage: boolean; canCreate?: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [hasAtt, setHasAtt] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [sort, setSort] = useState("date");
  const [page, setPage] = useState(1);
  const [trash, setTrash] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<DeletableSet | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pageSize = 25;

  function load() {
    const p = new URLSearchParams();
    if (trash) p.set("trash", "1");
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (vehicle) p.set("vehicle", vehicle);
    if (hasAtt) p.set("hasAttachments", hasAtt);
    if (year) p.set("year", year);
    if (year && month) p.set("month", String(Number(month) - 1));
    if (sort) p.set("sort", sort);
    p.set("page", String(page));
    fetch(`/api/logistics/export-sets?${p.toString()}`).then((r) => r.ok ? r.json() : null).then((j) => {
      if (j) { setRows(j.rows ?? []); setKpi(j.kpi ?? null); setTotal(j.total ?? 0); }
    });
  }
  // Всяка смяна на филтър връща на страница 1.
  useEffect(() => { setPage(1); }, [q, status, vehicle, hasAtt, year, month, sort, trash]);
  useEffect(() => { load(); }, [q, status, vehicle, hasAtt, year, month, sort, trash, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: string) {
    setBusyId(id);
    const r = await fetch(`/api/logistics/export-sets/${id}/restore`, { method: "POST" });
    setBusyId(null);
    if (r.ok) load();
  }

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const activeDocs = (docs: DocLite[]) => docs.filter((d) => isActiveExportDocType(d.docType)).length;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "5px 8px", fontSize: 12.5 } as const;
  const toDeletable = (r: Row): DeletableSet => ({ id: r.id, invoiceNumber: r.invoiceNumber, invoiceDate: r.invoiceDate, clientName: r.buyer, truckRegSnapshot: r.truckRegSnapshot, trailerReg: r.trailerReg, productSnapshot: r.productSnapshot, quantity: r.quantity, unit: r.unit });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function Kpicard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return <div className="glass panel" style={{ padding: "8px 13px", minWidth: 96 }}>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif", color: warn && value !== "0" ? "var(--brass)" : "inherit" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div>
    </div>;
  }

  return (
    <div onClick={() => setMenuId(null)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.title")}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTrash((v) => !v)} style={trash ? { background: "var(--brick)", color: "#fff" } : undefined}>{t("logistics.export.trash")}</button>
          {canCreate && !trash && <Link href="/dashboard/logistics/export/new" className="btn btn-primary btn-sm">{t("logistics.export.add")}</Link>}
        </div>
      </div>

      {kpi && !trash && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Kpicard label={t("logistics.export.kpiTotal")} value={String(kpi.total)} />
          <Kpicard label={t("logistics.export.kpiMonth")} value={String(kpi.thisMonth)} />
          <Kpicard label={t("logistics.export.kpiQuantity")} value={qtyUnit(kpi.totalQuantity, "t")} />
          <Kpicard label={t("logistics.export.kpiWithDocs")} value={String(kpi.withAttachments)} />
          <Kpicard label={t("logistics.export.kpiNoDocs")} value={String(kpi.withoutAttachments)} warn />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...sel, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.export.search")} />
        <input style={{ ...sel, width: 130 }} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder={t("logistics.export.truck")} />
        <select style={sel} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">{t("logistics.export.allYears")}</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={sel} value={month} onChange={(e) => setMonth(e.target.value)} disabled={!year}>
          <option value="">{t("logistics.export.allMonths")}</option>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
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
        <select style={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="date">{t("logistics.export.sortDate")}</option>
          <option value="quantity">{t("logistics.export.sortQty")}</option>
          <option value="invoice">{t("logistics.export.sortInvoice")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{trash ? t("logistics.export.trashEmpty") : t("logistics.export.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.export.invoiceNumber")}</th><th style={th}>{t("logistics.export.date")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.export.product")}</th><th style={th}>{t("logistics.export.quantity")}</th>
              <th style={th}>{t("logistics.export.buyer")}</th><th style={th}>{t("logistics.export.status")}</th><th style={th}>{t("logistics.export.documents")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link></td>
                  <td style={td}>{dt(r.invoiceDate)}</td><td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{r.productSnapshot ?? "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? qtyUnit(r.quantity, r.unit) : "—"}</td>
                  <td style={td}>{r.buyer ?? "—"}</td>
                  <td style={td}>{r.status === "finalized" ? t("logistics.export.stReady") : t("logistics.export.stDraft")}</td>
                  <td style={td} className="num" title={t("logistics.export.docsBreakdown", { gen: activeDocs(r.documents), att: r.attachmentCount })}>
                    {activeDocs(r.documents)}/{ACTIVE_TOTAL}{r.attachmentCount > 0 ? <span style={{ color: "var(--brass)" }}> +{r.attachmentCount}</span> : null}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {trash ? (
                      canManage && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} disabled={busyId === r.id} onClick={() => restore(r.id)}>{t("logistics.export.restore")}</button>
                    ) : (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.dossier")}</Link>
                        {canManage && <Link href={`/dashboard/logistics/export/${r.id}/edit`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.edit")}</Link>}
                        {canManage && (
                          <span style={{ position: "relative" }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "2px 8px" }} onClick={(e) => { e.stopPropagation(); setMenuId(menuId === r.id ? null : r.id); }}>⋯</button>
                            {menuId === r.id && (
                              <span style={{ position: "absolute", right: 0, top: "100%", zIndex: 20, background: "var(--paper,#fff)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 140 }}>
                                <button onClick={(e) => { e.stopPropagation(); setMenuId(null); setDelTarget(toDeletable(r)); }}
                                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12.5, color: "var(--brick)", background: "none", border: "none", cursor: "pointer" }}>
                                  {t("logistics.export.delete")}
                                </button>
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{page} / {pages} · {total}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      )}

      {delTarget && <ExportDeleteModal set={delTarget} onClose={() => setDelTarget(null)} onDeleted={() => { setDelTarget(null); load(); }} />}
    </div>
  );
}
