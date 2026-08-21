"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type Row = { id: string; name: string; eik: string | null; invoices: number; revenue: number; quantity: number; lastPurchase: string | null };

export function LogisticsClients() {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { fetch("/api/logistics/clients").then((r) => r.ok ? r.json() : []).then(setRows); }, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? rows.filter((r) => (r.name + " " + (r.eik ?? "")).toLowerCase().includes(s)) : rows;
    return [...list].sort((a, b) => b.revenue - a.revenue);
  }, [q, rows]);

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{t("logistics.clients.title")}</h1>
      <input placeholder={t("logistics.common.search")} value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "7px 10px", fontSize: 13, marginBottom: 12, width: "100%", maxWidth: 320 }} />
      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.clients.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.clients.name")}</th><th style={th}>{t("logistics.clients.invoices")}</th>
              <th style={th}>{t("logistics.clients.quantity")}</th><th style={th}>{t("logistics.clients.revenue")}</th><th style={th}>{t("logistics.clients.lastPurchase")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/clients/${r.id}`} style={{ fontWeight: 600 }}>{r.name}</Link>{r.eik && <span style={{ color: "var(--muted)", fontSize: 11 }}> · {r.eik}</span>}</td>
                  <td style={td} className="num">{r.invoices}</td>
                  <td style={td} className="num">{qty(r.quantity)}</td>
                  <td style={td} className="num">{r.revenue}</td>
                  <td style={td}>{dt(r.lastPurchase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
