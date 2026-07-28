"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

export type AdminTrashRow = {
  id: string; number: string; type: string; companyName: string; clientName: string | null;
  deletedAt: string; deletedByName: string | null; reason: string | null; status: string;
};

export function AdminDeletedDocs({ rows }: { rows: AdminTrashRow[] }) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [companyF, setCompanyF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const companies = useMemo(() => [...new Set(rows.map((r) => r.companyName))].sort(), [rows]);
  const DOC_TYPES = ["invoice", "proforma", "quote", "credit_note", "debit_note"];

  const filtered = useMemo(() => rows.filter((r) => {
    if (companyF && r.companyName !== companyF) return false;
    if (typeF && r.type !== typeF) return false;
    if (q.trim()) { const s = q.toLowerCase(); if (![r.number, r.companyName, r.clientName ?? ""].some((v) => v.toLowerCase().includes(s))) return false; }
    return true;
  }), [rows, q, companyF, typeF]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale);
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function act(action: "restore" | "permanent", ids: string[]) {
    if (ids.length === 0) return;
    if (action === "permanent" && !confirm(t("documents.trash.confirmPermanent"))) return;
    setBusy(true);
    await fetch("/api/admin/documents/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids }) });
    setBusy(false); setSel(new Set()); router.refresh();
  }

  return (
    <>
      <div className="glass panel" style={{ padding: "12px 14px", marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder={t("documents.trash.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px", minWidth: 180, padding: "7px 10px", fontSize: 12.5 }} />
        <select value={companyF} onChange={(e) => setCompanyF(e.target.value)} style={{ padding: "7px 10px", fontSize: 12.5, width: "auto" }}>
          <option value="">{t("documents.trash.allCompanies")}</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)} style={{ padding: "7px 10px", fontSize: 12.5, width: "auto" }}>
          <option value="">{t("documents.trash.allTypes")}</option>
          {DOC_TYPES.map((ty) => <option key={ty} value={ty}>{t(`documents.types.${ty}`)}</option>)}
        </select>
        {sel.size > 0 && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("restore", [...sel])}>{t("documents.trash.restoreSel", { n: sel.size })}</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={() => act("permanent", [...sel])}>{t("documents.trash.permanentSel", { n: sel.size })}</button>
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("documents.trash.empty")}</div>
      ) : (
        <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto" }}>
          <table>
            <thead><tr>
              <th style={{ width: 30 }}></th>
              <th>{t("documents.trash.colCompany")}</th><th>{t("documents.trash.colNumber")}</th><th>{t("documents.trash.colType")}</th>
              <th>{t("documents.trash.colClient")}</th><th>{t("documents.trash.colStatus")}</th>
              <th>{t("documents.trash.colDeletedBy")}</th><th>{t("documents.trash.colDeletedAt")}</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} style={{ width: "auto" }} /></td>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.companyName}</td>
                  <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{r.number}</td>
                  <td style={{ fontSize: 13 }}>{t(`documents.types.${r.type}`)}</td>
                  <td style={{ fontSize: 12.5 }}>{r.clientName ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{t(`documents.status.${r.status}`)}</td>
                  <td style={{ fontSize: 12.5 }}>{r.deletedByName ?? "—"}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmt(r.deletedAt)}</td>
                  <td style={{ display: "flex", gap: 5 }}>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("restore", [r.id])}>{t("documents.trash.restore")}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={() => act("permanent", [r.id])}>{t("documents.trash.permanent")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
