"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

export type TrashRow = {
  id: string; number: string; type: string; clientName: string | null;
  issueDate: string; deletedAt: string; deletedByName: string | null; reason: string | null; status: string;
  autoDeleteDays: number; // дни до автоматично изтриване
};

export function TrashList({ rows, canPermanent, canRestore = true }: { rows: TrashRow[]; canPermanent: boolean; canRestore?: boolean }) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [userF, setUserF] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const users = useMemo(() => [...new Set(rows.map((r) => r.deletedByName).filter(Boolean) as string[])], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (typeF && r.type !== typeF) return false;
    if (userF && r.deletedByName !== userF) return false;
    if (q.trim()) { const s = q.toLowerCase(); if (!r.number.toLowerCase().includes(s) && !(r.clientName ?? "").toLowerCase().includes(s)) return false; }
    return true;
  }), [rows, q, typeF, userF]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale);
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function one(id: string, action: "restore" | "permanent") {
    if (action === "permanent" && !confirm(t("documents.trash.confirmPermanent"))) return;
    setBusy(true);
    const url = action === "restore" ? `/api/documents/${id}/restore` : `/api/documents/${id}/permanent`;
    await fetch(url, { method: action === "restore" ? "POST" : "DELETE" });
    setBusy(false); router.refresh();
  }
  async function bulk(action: "restore" | "permanent") {
    if (sel.size === 0) return;
    if (action === "permanent" && !confirm(t("documents.trash.confirmPermanent"))) return;
    setBusy(true);
    await fetch("/api/documents/trash/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids: [...sel] }) });
    setBusy(false); setSel(new Set()); router.refresh();
  }

  const DOC_TYPES = ["invoice", "proforma", "quote", "credit_note", "debit_note"];

  return (
    <>
      <div className="glass panel" style={{ padding: "12px 14px", marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder={t("documents.trash.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px", minWidth: 180, padding: "7px 10px", fontSize: 12.5 }} />
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)} style={{ padding: "7px 10px", fontSize: 12.5, width: "auto" }}>
          <option value="">{t("documents.trash.allTypes")}</option>
          {DOC_TYPES.map((ty) => <option key={ty} value={ty}>{t(`documents.types.${ty}`)}</option>)}
        </select>
        <select value={userF} onChange={(e) => setUserF(e.target.value)} style={{ padding: "7px 10px", fontSize: 12.5, width: "auto" }}>
          <option value="">{t("documents.trash.allUsers")}</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {sel.size > 0 && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
            {canRestore && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => bulk("restore")}>{t("documents.trash.restoreSel", { n: sel.size })}</button>}
            {canPermanent && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={() => bulk("permanent")}>{t("documents.trash.permanentSel", { n: sel.size })}</button>}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("documents.trash.empty")}</div>
      ) : (
        <div className="glass panel" style={{ padding: "8px 0" }}>
          <table>
            <thead><tr>
              <th style={{ width: 30 }}></th>
              <th>{t("documents.trash.colNumber")}</th><th>{t("documents.trash.colType")}</th><th>{t("documents.trash.colClient")}</th>
              <th>{t("documents.trash.colStatus")}</th><th>{t("documents.trash.colDeletedBy")}</th><th>{t("documents.trash.colDeletedAt")}</th>
              <th>{t("documents.trash.colReason")}</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} style={{ width: "auto" }} /></td>
                  <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{r.number}</td>
                  <td style={{ fontSize: 13 }}>{t(`documents.types.${r.type}`)}</td>
                  <td style={{ fontWeight: 600 }}>{r.clientName ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{t(`documents.status.${r.status}`)}</td>
                  <td style={{ fontSize: 12.5 }}>{r.deletedByName ?? "—"}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmt(r.deletedAt)}<div style={{ fontSize: 10.5, color: "var(--muted)" }}>{t("documents.trash.autoIn", { days: r.autoDeleteDays })}</div></td>
                  <td style={{ fontSize: 12, color: "var(--ink-soft)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason ?? "—"}</td>
                  <td style={{ display: "flex", gap: 5 }}>
                    {canRestore && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => one(r.id, "restore")}>{t("documents.trash.restore")}</button>}
                    {canPermanent && <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} disabled={busy} onClick={() => one(r.id, "permanent")}>{t("documents.trash.permanent")}</button>}
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
