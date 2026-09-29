"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type Row = {
  id: string; kind: "document" | "mk"; number: string; date: string | null; issuer: string; client: string;
  setId: string | null; setNumber: string | null; destination: string | null; truck: string | null;
  quantity: number | null; unit: string | null; net: number; currency: string; paymentStatus: string | null;
};
type Kpi = { total: number; byCurrency: Record<string, number>; byStatus: { paid: number; partially_paid: number; unpaid: number } };

const YEARS = (() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2, y - 3]; })();
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

/** READ-ONLY списък на свързаните MK фактури (§C1). Няма създаване/редакция от този контекст. */
export function MkLinkedInvoices() {
  const t = useT();
  const { num, qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => { setPage(1); }, [q, status, year, month]);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (year) p.set("year", year);
    if (year && month) p.set("month", String(Number(month) - 1));
    p.set("page", String(page));
    fetch(`/api/logistics/mk-invoices?${p.toString()}`).then((r) => r.ok ? r.json() : null).then((j) => {
      if (j) { setRows(j.rows ?? []); setKpi(j.kpi ?? null); setTotal(j.total ?? 0); }
    });
  }, [q, status, year, month, page]);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "5px 8px", fontSize: 12.5 } as const;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const payLabel = (s: string | null) => s ? t(`logistics.mkview.pay.${s}`) : "—";
  const currencyTotals = kpi ? Object.entries(kpi.byCurrency) : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.mksale.title")}</h1>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,.06)", color: "var(--muted)" }}>{t("logistics.mkview.readOnly")}</span>
      </div>

      {kpi && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Card label={t("logistics.mkview.kpiTotal")} value={String(kpi.total)} />
          <Card label={t("logistics.mkview.pay.paid")} value={String(kpi.byStatus.paid)} />
          <Card label={t("logistics.mkview.pay.partially_paid")} value={String(kpi.byStatus.partially_paid)} />
          <Card label={t("logistics.mkview.kpiUnpaid")} value={String(kpi.byStatus.unpaid)} />
          {currencyTotals.map(([cur, sum]) => <Card key={cur} label={t("logistics.mkview.kpiTotalCur", { cur })} value={num(sum)} />)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...sel, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.mkview.search")} />
        <select style={sel} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">{t("logistics.export.allYears")}</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={sel} value={month} onChange={(e) => setMonth(e.target.value)} disabled={!year}>
          <option value="">{t("logistics.export.allMonths")}</option>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("logistics.mkview.allStatuses")}</option>
          {["paid", "partially_paid", "issued", "sent", "overdue", "draft"].map((s) => <option key={s} value={s}>{payLabel(s)}</option>)}
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.mkview.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.mkview.number")}</th><th style={th}>{t("logistics.mkview.date")}</th>
              <th style={th}>{t("logistics.mkview.issuer")}</th><th style={th}>{t("logistics.mkview.client")}</th>
              <th style={th}>{t("logistics.mkview.delivery")}</th><th style={th}>{t("logistics.export.destination")}</th>
              <th style={th}>{t("logistics.export.truck")}</th><th style={th}>{t("logistics.mksale.quantity")}</th>
              <th style={th}>{t("logistics.mksale.net")}</th><th style={th}>{t("logistics.mkview.payStatus")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/mk-invoice/${r.id}`} style={{ fontWeight: 600 }}>{r.number}</Link></td>
                  <td style={td}>{dt(r.date)}</td>
                  <td style={td}>{r.issuer}</td>
                  <td style={td}>{r.client}</td>
                  <td style={td}>{r.setId ? <Link href={`/dashboard/logistics/export/${r.setId}`}>{r.setNumber}</Link> : "—"}</td>
                  <td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{r.truck ?? "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? qtyUnit(r.quantity, r.unit ?? "t") : "—"}</td>
                  <td style={td} className="num">{num(r.net)} {r.currency}</td>
                  <td style={td}>{payLabel(r.paymentStatus)}</td>
                  <td style={td}><Link href={`/dashboard/logistics/mk-invoice/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }}>{t("logistics.export.view")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{page} / {pages} · {total}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="glass panel" style={{ padding: "8px 13px", minWidth: 96 }}>
    <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{value}</div>
    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div>
  </div>;
}
