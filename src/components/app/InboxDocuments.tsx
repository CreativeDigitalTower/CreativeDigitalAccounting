"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { downloadDocsAsZip, todayStamp } from "@/lib/downloadDocs";
import { useI18n } from "@/components/i18n/I18nProvider";

export type InboxDoc = { id: string; type: string; number: string; issueDate: string; fromName: string; total: number; currency: string };

export function InboxDocuments({ docs }: { docs: InboxDoc[] }) {
  const { t, locale } = useI18n();
  const monthName = (i: number) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2000, i, 1));
  const docLabel = (type: string) => { const k = t(`finance.inbox.doc${type.charAt(0).toUpperCase()}${type.slice(1)}`); return k.startsWith("finance.") ? type : k; };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  // Групиране по година → месец (най-новите най-отгоре)
  const groups = useMemo(() => {
    const map = new Map<string, InboxDoc[]>();
    for (const d of docs) {
      const dt = new Date(d.issueDate);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [docs]);

  const allIds = docs.map((d) => d.id);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGroup(ids: string[], on: boolean) {
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  async function download(ids: string[]) {
    if (!ids.length || downloading) return;
    setDownloading(true);
    try {
      // Всеки документ — самостоятелен файл; при няколко избрани → ZIP архив.
      await downloadDocsAsZip(ids, `${t("finance.inbox.zipName")}-${todayStamp()}`);
    } catch { alert(t("finance.inbox.dlError")); }
    finally { setDownloading(false); }
  }

  if (docs.length === 0) {
    return (
      <div className="glass panel" style={{ padding: "8px 0", marginBottom: 20 }}>
        <div style={{ textAlign: "center", padding: "44px 0", color: "var(--muted)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13.5 5.5 5A2 2 0 0 1 7.4 3.5h9.2A2 2 0 0 1 18.5 5L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-5.5Z"/><path d="M3 13.5h5l1.5 2.5h5L16 13.5h5"/></svg></div>
          <div style={{ fontSize: 14 }}>{t("finance.inbox.empty")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Лента с масови действия */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {t("finance.inbox.selectAll", { n: docs.length })}
        </label>
        {selected.size > 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("finance.inbox.selected", { n: selected.size })}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {downloading && <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("finance.inbox.generating")}</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => download([...selected])} disabled={selected.size === 0 || downloading}>
            {t("finance.inbox.downloadSelected")}{selected.size ? ` (${selected.size})` : ""}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => download(allIds)} disabled={downloading}>{t("finance.inbox.downloadAll")}</button>
        </div>
      </div>

      {groups.map(([key, list]) => {
        const [y, m] = key.split("-").map(Number);
        const ids = list.map((d) => d.id);
        const groupAll = ids.every((id) => selected.has(id));
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                <input type="checkbox" checked={groupAll} onChange={(e) => toggleGroup(ids, e.target.checked)} />
                {monthName(m - 1)} {y}
              </label>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald-dark)", background: "rgba(15,138,106,.12)", borderRadius: 10, padding: "1px 8px" }}>{list.length}</span>
            </div>
            <div className="glass panel" style={{ padding: 0, overflow: "hidden" }}>
              <table>
                <thead><tr><th style={{ width: 34 }}></th><th>{t("finance.inbox.thFrom")}</th><th>{t("finance.inbox.thDoc")}</th><th>{t("finance.inbox.thDate")}</th><th className="num">{t("finance.inbox.thAmount")}</th><th></th></tr></thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id}>
                      <td><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} /></td>
                      <td style={{ fontWeight: 600 }}>{d.fromName}</td>
                      <td>{t("finance.inbox.docNum", { type: docLabel(d.type), number: d.number })}</td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(d.issueDate).toLocaleDateString(locale)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(d.total, d.currency)}</td>
                      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => download([d.id])} title={t("finance.inbox.dlPdfTitle")}>{t("finance.inbox.dlPdf")}</button>
                        <Link href={`/dashboard/inbox/${d.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }}>{t("finance.inbox.view")}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
