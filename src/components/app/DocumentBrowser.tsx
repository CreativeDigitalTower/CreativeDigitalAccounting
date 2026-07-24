"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusSelect } from "@/components/app/StatusSelect";
import { UiIcon } from "@/components/app/NavIcons";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatCurrency, toBGN, isDualCurrencyActive, groupByMonth } from "@/lib/constants";
import { SORT_OPTIONS, sortDocs, DEFAULT_SORT, type SortKey } from "@/lib/documentSort";

export type DocRow = {
  id: string; number: string; type: string;
  clientId: string | null; clientName: string | null;
  issueDate: string; dueDate: string | null; createdAt: string;
  total: number; currency: string; status: string;
};

type Filters = { from: string; to: string; clientId: string; status: string; type: string; payment: string; overdue: boolean };
const EMPTY: Filters = { from: "", to: "", clientId: "", status: "", type: "", payment: "", overdue: false };
const SORT_LS = "cda_doc_sort";
const FILTER_LS = "cda_doc_filters";
const DOC_TYPES = ["invoice", "proforma", "quote", "credit_note", "debit_note"];
const STATUSES = ["draft", "sent", "paid", "overdue", "partially_paid", "cancelled"];

function isOverdue(d: DocRow): boolean {
  if (!d.dueDate || d.status === "paid" || d.status === "cancelled") return false;
  const due = new Date(d.dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function DocumentBrowser({ docs }: { docs: DocRow[] }) {
  const { t, locale } = useI18n();
  const dual = isDualCurrencyActive();
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [ready, setReady] = useState(false);

  // Възстанови запомненото подреждане/филтри
  useEffect(() => {
    try {
      const s = localStorage.getItem(SORT_LS); if (s) setSort(s as SortKey);
      const f = localStorage.getItem(FILTER_LS); if (f) setFilters({ ...EMPTY, ...JSON.parse(f) });
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(SORT_LS, sort); } catch { /* ignore */ } }, [sort, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem(FILTER_LS, JSON.stringify(filters)); } catch { /* ignore */ } }, [filters, ready]);

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of docs) if (d.clientId && d.clientName) m.set(d.clientId, d.clientName);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [docs]);

  const rows = useMemo(() => {
    const f = filters;
    const filtered = docs.filter((d) => {
      if (f.type && d.type !== f.type) return false;
      if (f.status && d.status !== f.status) return false;
      if (f.clientId && d.clientId !== f.clientId) return false;
      if (f.from && new Date(d.issueDate) < new Date(f.from)) return false;
      if (f.to && new Date(d.issueDate) > new Date(f.to + "T23:59:59")) return false;
      if (f.payment === "paid" && d.status !== "paid") return false;
      if (f.payment === "unpaid" && (d.status === "paid" || d.status === "cancelled")) return false;
      if (f.overdue && !isOverdue(d)) return false;
      return true;
    });
    return sortDocs(filtered, sort);
  }, [docs, filters, sort]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((p) => ({ ...p, [k]: v }));
  const selStyle: React.CSSProperties = { padding: "7px 10px", fontSize: 12.5, width: "auto" };

  return (
    <>
      <div className="glass panel" style={{ padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          {t("documents.browser.sortBy")}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selStyle}>
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{t(o.labelKey)}</option>)}
          </select>
        </label>
        <span style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
        <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} title={t("documents.browser.from")} style={selStyle} />
        <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} title={t("documents.browser.to")} style={selStyle} />
        <select value={filters.clientId} onChange={(e) => set("clientId", e.target.value)} style={selStyle}>
          <option value="">{t("documents.browser.allClients")}</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => set("type", e.target.value)} style={selStyle}>
          <option value="">{t("documents.browser.allTypes")}</option>
          {DOC_TYPES.map((ty) => <option key={ty} value={ty}>{t(`documents.types.${ty}`)}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => set("status", e.target.value)} style={selStyle}>
          <option value="">{t("documents.browser.allStatuses")}</option>
          {STATUSES.map((st) => <option key={st} value={st}>{t(`documents.status.${st}`)}</option>)}
        </select>
        <select value={filters.payment} onChange={(e) => set("payment", e.target.value)} style={selStyle}>
          <option value="">{t("documents.browser.allPayment")}</option>
          <option value="paid">{t("documents.browser.paid")}</option>
          <option value="unpaid">{t("documents.browser.unpaid")}</option>
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" checked={filters.overdue} onChange={(e) => set("overdue", e.target.checked)} style={{ width: "auto" }} />
          {t("documents.browser.overdue")}
        </label>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY)} style={{ marginLeft: "auto" }}>{t("documents.browser.reset")}</button>
      </div>

      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 10 }}>{t("documents.browser.count", { n: rows.length })}</div>

      {rows.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("documents.browser.empty")}</div>
      ) : (
        groupByMonth(rows).map((group) => (
          <div key={group.key} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px" }}>{group.label}</h3>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("documents.page.th.number")}</th><th>{t("documents.page.th.type")}</th><th>{t("documents.page.th.client")}</th><th>{t("documents.page.th.date")}</th><th>{t("documents.page.th.due")}</th>
                    <th className="num">{t("documents.page.th.amount")}</th>{dual && <th className="num">BGN</th>}<th>{t("documents.page.th.status")}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((doc) => (
                    <tr key={doc.id}>
                      <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{doc.number}</td>
                      <td style={{ fontSize: 13 }}>{t(`documents.types.${doc.type}`)}</td>
                      <td style={{ fontWeight: 600 }}>{doc.clientName ?? "—"}</td>
                      <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{new Date(doc.issueDate).toLocaleDateString(locale)}</td>
                      <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString(locale) : "—"}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(doc.total, doc.currency)}</td>
                      {dual && <td className="num" style={{ fontSize: 11.5, color: "var(--muted)" }}>{formatCurrency(toBGN(doc.total), "BGN")}</td>}
                      <td><StatusSelect id={doc.id} status={doc.status} /></td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">{t("documents.page.view")}</Link>
                        <Link href={`/dashboard/documents/${doc.id}/edit`} className="btn btn-ghost btn-sm" title={t("documents.page.edit")} style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}
