"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

export type ReportRow = {
  number: string; date: string; product: string; batch: string;
  quantity: number; unit: string; materialsCost: number; unitCost: number; operator: string; status: string;
};

type SavedFilter = { name: string; from: string; to: string; q: string };
const LS_KEY = "cda_prod_report_filters";

// Инструменти за производствените справки: филтър по период + търсене, CSV export
// и запазени филтри (localStorage). Клиентски — сървърът смята справката по URL.
export function ProductionReportTools({ from, to, q, rows }: { from: string; to: string; q: string; rows: ReportRow[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [f, setF] = useState({ from, to, q });
  const [saved, setSaved] = useState<SavedFilter[]>([]);

  useEffect(() => { try { const s = localStorage.getItem(LS_KEY); if (s) setSaved(JSON.parse(s)); } catch { /* ignore */ } }, []);

  function apply(next = f) {
    const p = new URLSearchParams();
    if (next.from) p.set("from", next.from);
    if (next.to) p.set("to", next.to);
    if (next.q.trim()) p.set("q", next.q.trim());
    router.push(`/dashboard/production/reports?${p.toString()}`);
  }

  function saveFilter() {
    const name = prompt(t("prodReports.tools.saveName"));
    if (!name) return;
    const next = [{ name, from: f.from, to: f.to, q: f.q }, ...saved.filter((x) => x.name !== name)].slice(0, 10);
    setSaved(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function loadFilter(s: SavedFilter) { setF({ from: s.from, to: s.to, q: s.q }); apply({ from: s.from, to: s.to, q: s.q }); }
  function delFilter(name: string) {
    const next = saved.filter((x) => x.name !== name);
    setSaved(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function exportCsv() {
    const head = ["Номер", "Дата", "Продукт", "Партида", "Количество", "Мярка", "Материали", "Ед. себестойност", "Оператор", "Статус"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(",")];
    for (const r of rows) lines.push([r.number, r.date, r.product, r.batch, r.quantity, r.unit, r.materialsCost, r.unitCost, r.operator, r.status].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `production-report-${f.from}_${f.to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="glass panel" style={{ padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div><label style={{ fontSize: 11 }}>{t("prodReports.tools.from")}</label><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
      <div><label style={{ fontSize: 11 }}>{t("prodReports.tools.to")}</label><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
      <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 11 }}>{t("prodReports.tools.search")}</label><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder={t("prodReports.tools.searchPh")} style={{ padding: "5px 8px", fontSize: 12.5, width: "100%" }} /></div>
      <button className="btn btn-primary btn-sm" onClick={() => apply()}>{t("prodReports.tools.apply")}</button>
      <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={rows.length === 0}>{t("prodReports.tools.export")}</button>
      <button className="btn btn-ghost btn-sm" onClick={saveFilter}>{t("prodReports.tools.save")}</button>
      {saved.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {saved.map((s) => (
            <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, border: "1px solid var(--border)", borderRadius: 12, padding: "2px 6px 2px 10px" }}>
              <button onClick={() => loadFilter(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--navy)" }}>{s.name}</button>
              <button onClick={() => delFilter(s.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
