"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusSelect, statusMeta } from "@/components/app/StatusSelect";
import { ContextMenu, type MenuItem } from "@/components/app/ContextMenu";
import { formatCurrency, groupByMonth } from "@/lib/constants";
import { downloadDocsAsZip, todayStamp } from "@/lib/downloadDocs";
import { UiIcon } from "@/components/app/NavIcons";

export type InvoiceRow = {
  id: string; number: string; clientName: string; issueDate: string; dueDate: string | null;
  total: number; currency: string; status: string;
};

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; doc: InvoiceRow } | null>(null);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/documents/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }
  function menuItems(doc: InvoiceRow): MenuItem[] {
    return [
      { label: "Отвори", icon: <UiIcon.doc width={15} height={15} />, onClick: () => router.push(`/dashboard/documents/${doc.id}`) },
      { label: "Редактирай", icon: <UiIcon.edit width={15} height={15} />, onClick: () => router.push(`/dashboard/documents/${doc.id}/edit`) },
      { label: "Изтегли PDF", icon: "↓", onClick: () => downloadOne(doc) },
      { label: "Копирай номер", icon: "⧉", onClick: () => navigator.clipboard?.writeText(doc.number) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Маркирай като платена", icon: <UiIcon.check width={15} height={15} />, onClick: () => setStatus(doc.id, "paid") },
      { label: "Маркирай като просрочена", icon: <UiIcon.warning width={15} height={15} />, onClick: () => setStatus(doc.id, "overdue") },
    ];
  }

  const groups = groupByMonth(invoices);
  const allIds = invoices.map((i) => i.id);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  // Напомняния за плащане: жълто (≤5 дни до падеж) и червено (просрочена)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  function reminder(doc: InvoiceRow): { kind: "overdue" | "soon"; days: number } | null {
    if (!doc.dueDate || doc.status === "paid" || doc.status === "cancelled") return null;
    const due = new Date(doc.dueDate); due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { kind: "overdue", days: -days };
    if (days <= 5) return { kind: "soon", days };
    return null;
  }
  const overdueCount = invoices.filter((d) => reminder(d)?.kind === "overdue").length;
  const soonCount = invoices.filter((d) => reminder(d)?.kind === "soon").length;

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  async function downloadOne(row: InvoiceRow) {
    setBusyId(row.id);
    try { await downloadDocsAsZip([row.id], row.number); } // 1 документ → директно PDF
    catch { alert("Неуспешно изтегляне на PDF."); }
    finally { setBusyId(null); }
  }

  async function downloadSelected() {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      // Всеки документ — самостоятелен файл; при няколко избрани → ZIP архив.
      const ids = invoices.filter((i) => selected.has(i.id)).map((i) => i.id);
      await downloadDocsAsZip(ids, `Документи-${todayStamp()}`);
    } catch { alert("Неуспешно изтегляне."); }
    finally { setDownloading(false); }
  }

  return (
    <>
      {(overdueCount > 0 || soonCount > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {overdueCount > 0 && (
            <div style={{ flex: 1, minWidth: 240, background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 7 }} />{overdueCount} просрочени фактури — потърсете плащане от клиентите.
            </div>
          )}
          {soonCount > 0 && (
            <div style={{ flex: 1, minWidth: 240, background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 7 }} />{soonCount} фактури с наближаващ падеж (до 5 дни).
            </div>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="glass" style={{ position: "sticky", top: 8, zIndex: 30, padding: "10px 16px", borderRadius: 10, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Избрани: {selected.size}</span>
          <button className="btn btn-primary btn-sm" onClick={downloadSelected} disabled={downloading}>
            {downloading ? "Генериране…" : `↓ Изтегли избраните (${selected.size})`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Изчисти избора</button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 8px", textTransform: "capitalize" }}>{group.label}</h3>
          <div className="glass panel" style={{ padding: "8px 0" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: "auto" }} title="Избери всички" /></th>
                  <th>№</th><th>Клиент</th><th>Дата</th><th>Падеж</th><th className="num">Сума</th><th>Статус</th><th></th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((doc) => {
                  const rem = reminder(doc);
                  const sm = statusMeta(doc.status);
                  return (
                  <tr key={doc.id}
                    onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, doc }); }}
                    style={selected.has(doc.id)
                    ? { background: "var(--emerald-soft)", boxShadow: `inset 4px 0 0 ${sm.dot}` }
                    : { boxShadow: `inset 4px 0 0 ${sm.dot}` }}>
                    <td><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} style={{ width: "auto" }} /></td>
                    <td className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{doc.number}</td>
                    <td style={{ fontWeight: 600 }}>{doc.clientName}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(doc.issueDate).toLocaleDateString("bg-BG")}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("bg-BG") : "—"}
                      {rem && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: rem.kind === "overdue" ? "var(--brick)" : "var(--brass)", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
                          {rem.kind === "overdue" ? `просрочена с ${rem.days} дни` : `до падеж: ${rem.days} дни`}
                        </div>
                      )}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(doc.total, doc.currency)}</td>
                    <td><StatusSelect id={doc.id} status={doc.status} /></td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">Отвори</Link>
                      <Link href={`/dashboard/documents/${doc.id}/edit`} className="btn btn-ghost btn-sm" title="Редактирай" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadOne(doc)} disabled={busyId === doc.id} title="Изтегли PDF">
                        {busyId === doc.id ? "…" : "↓ PDF"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.doc)} onClose={() => setMenu(null)} />}
    </>
  );
}
