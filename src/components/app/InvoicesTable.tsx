"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusSelect } from "@/components/app/StatusSelect";
import { formatCurrency, groupByMonth } from "@/lib/constants";
import { downloadInvoicesPdf } from "@/lib/invoicePdf";

export type InvoiceRow = {
  id: string; number: string; clientName: string; issueDate: string; dueDate: string | null;
  total: number; currency: string; status: string;
};

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const groups = groupByMonth(invoices);
  const allIds = invoices.map((i) => i.id);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  async function downloadOne(row: InvoiceRow) {
    setBusyId(row.id);
    try { await downloadInvoicesPdf([row.id], row.number); }
    catch { alert("Неуспешно изтегляне на PDF."); }
    finally { setBusyId(null); }
  }

  async function downloadSelected() {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const ids = invoices.filter((i) => selected.has(i.id)).map((i) => i.id);
      await downloadInvoicesPdf(ids, ids.length === 1 ? invoices.find((i) => i.id === ids[0])!.number : `Фактури-${ids.length}`);
    } catch { alert("Неуспешно изтегляне на PDF."); }
    finally { setDownloading(false); }
  }

  return (
    <>
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
                {group.items.map((doc) => (
                  <tr key={doc.id} style={selected.has(doc.id) ? { background: "var(--emerald-soft)" } : undefined}>
                    <td><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} style={{ width: "auto" }} /></td>
                    <td className="num" style={{ fontSize: 12.5 }}>{doc.number}</td>
                    <td style={{ fontWeight: 600 }}>{doc.clientName}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(doc.issueDate).toLocaleDateString("bg-BG")}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("bg-BG") : "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(doc.total, doc.currency)}</td>
                    <td><StatusSelect id={doc.id} status={doc.status} /></td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <Link href={`/dashboard/documents/${doc.id}`} className="btn btn-ghost btn-sm">Отвори</Link>
                      <Link href={`/dashboard/documents/${doc.id}/edit`} className="btn btn-ghost btn-sm">✎</Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadOne(doc)} disabled={busyId === doc.id} title="Изтегли PDF">
                        {busyId === doc.id ? "…" : "↓ PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
