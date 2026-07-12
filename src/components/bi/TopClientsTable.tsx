"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type Row = { name: string; total: number; sharePct: number };
const money = (v: number) => Math.round(v).toLocaleString("bg-BG") + " €";

export function TopClientsTable({ rows }: { rows: Row[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: "name" | "total" | "sharePct"; dir: 1 | -1 }>({ k: "total", dir: -1 });

  const view = useMemo(() => {
    const f = rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
    return f.sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : a[sort.k] < b[sort.k] ? -1 : 0) * sort.dir);
  }, [rows, q, sort]);

  function th(k: "name" | "total" | "sharePct", label: string, right = false) {
    const active = sort.k === k;
    return (
      <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}
        style={{ cursor: "pointer", textAlign: right ? "right" : "left", userSelect: "none", whiteSpace: "nowrap" }}>
        {label}{active ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  return (
    <div className="bi-card bi-flat bi-in" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div className="bi-eyebrow" style={{ color: "var(--navy)" }}>{t("bi.section.topClients")}</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.actions.search") + "…"} style={{ marginLeft: "auto", width: "auto", minWidth: 180, fontSize: 12.5, padding: "6px 10px" }} />
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "22px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>{t("bi.topcl.empty")}</div>
      ) : (
        <div className="bi-table" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>{th("name", t("bi.topcl.client"))}{th("total", t("bi.topcl.revenue"), true)}{th("sharePct", t("bi.topcl.share"), true)}<th style={{ width: "28%" }}></th></tr></thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.name}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{money(r.total)}</td>
                  <td className="num" style={{ textAlign: "right", color: r.sharePct >= 40 ? "var(--brick)" : "var(--ink-soft)", fontWeight: 700 }}>{r.sharePct}%</td>
                  <td>
                    <div style={{ height: 7, background: "rgba(20,30,25,.06)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, r.sharePct)}%`, background: r.sharePct >= 40 ? "var(--brick)" : "var(--emerald)", borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
