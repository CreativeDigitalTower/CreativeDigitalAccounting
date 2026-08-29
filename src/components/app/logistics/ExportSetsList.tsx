"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ACTIVE_EXPORT_DOC_TYPES, isActiveExportDocType } from "@/lib/logistics/config";
import { ExportDeleteModal, type DeletableSet } from "@/components/app/logistics/ExportDeleteModal";

type DocLite = { docType: string; status: string; overridden: boolean };
type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; buyer: string | null; documents: DocLite[];
};

const ACTIVE_TOTAL = ACTIVE_EXPORT_DOC_TYPES.length; // 5

export function ExportSetsList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [dest, setDest] = useState("");
  const [status, setStatus] = useState("");
  const [trash, setTrash] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<DeletableSet | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() { fetch(`/api/logistics/export-sets${trash ? "?trash=1" : ""}`).then((r) => r.ok ? r.json() : []).then(setRows); }
  useEffect(() => { load(); }, [trash]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: string) {
    setBusyId(id);
    const r = await fetch(`/api/logistics/export-sets/${id}/restore`, { method: "POST" });
    setBusyId(null);
    if (r.ok) load();
  }

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
  const toDeletable = (r: Row): DeletableSet => ({ id: r.id, invoiceNumber: r.invoiceNumber, invoiceDate: r.invoiceDate, clientName: r.buyer, truckRegSnapshot: r.truckRegSnapshot, trailerReg: r.trailerReg, productSnapshot: r.productSnapshot, quantity: r.quantity, unit: r.unit });

  return (
    <div onClick={() => setMenuId(null)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.export.title")}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTrash((v) => !v)} style={trash ? { background: "var(--brick)", color: "#fff" } : undefined}>{t("logistics.export.trash")}</button>
          {canManage && !trash && <Link href="/dashboard/logistics/export/new" className="btn btn-primary btn-sm">{t("logistics.export.add")}</Link>}
        </div>
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
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{trash ? t("logistics.export.trashEmpty") : t("logistics.export.empty")}</div> : (
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
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {trash ? (
                      canManage && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} disabled={busyId === r.id} onClick={() => restore(r.id)}>{t("logistics.export.restore")}</button>
                    ) : (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/dashboard/logistics/export/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.open")}</Link>
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

      {delTarget && <ExportDeleteModal set={delTarget} onClose={() => setDelTarget(null)} onDeleted={() => { setDelTarget(null); load(); }} />}
    </div>
  );
}
