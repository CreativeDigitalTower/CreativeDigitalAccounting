"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { toCsv, csvBlob } from "@/lib/csv";

type Vol = { totalTons: number; deliveries: number };
type Data = {
  totalDeliveries: number;
  volume: { bulk: Vol; bags: Vol; unknown: Vol };
  byProduct: { label: string; deliveries: number; totalTons: number }[];
  byTruck: { label: string; carrierName: string | null; deliveries: number; totalTons: number; avgTons: number; maxPayloadTons: number | null; utilizationPct: number | null }[];
  byCarrier: { label: string; deliveries: number; totalTons: number }[];
};

export function LogisticsReportsClient() {
  const t = useT();
  const { num } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (status) p.set("status", status);
    const r = await fetch(`/api/logistics/reports?${p}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [from, to, status]);
  useEffect(() => { void load(); }, [load]);

  function download(name: string, csv: string) {
    const url = URL.createObjectURL(csvBlob(csv));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  // Един CSV с трите секции една под друга (превозвач / влекач / продукт) + обем.
  function exportCsv() {
    if (!data) return;
    const L = (k: string) => t(k);
    const blocks: string[] = [];
    blocks.push(toCsv([L("logistics.reports.byCarrier")], []));
    blocks.push(toCsv([L("logistics.fleet.carrier"), L("logistics.reports.deliveries"), L("logistics.reports.totalTons")],
      data.byCarrier.map((r) => [r.label, r.deliveries, r.totalTons])));
    blocks.push("");
    blocks.push(toCsv([L("logistics.reports.byTruck")], []));
    blocks.push(toCsv([L("logistics.fleet.truck"), L("logistics.fleet.carrier"), L("logistics.reports.deliveries"), L("logistics.reports.totalTons"), L("logistics.reports.avgTons"), L("logistics.fleet.maxLoad"), L("logistics.reports.utilization")],
      data.byTruck.map((r) => [r.label, r.carrierName ?? "—", r.deliveries, r.totalTons, r.avgTons, r.maxPayloadTons ?? "—", r.utilizationPct != null ? `${r.utilizationPct}%` : "—"])));
    blocks.push("");
    blocks.push(toCsv([L("logistics.reports.byProduct")], []));
    blocks.push(toCsv([L("logistics.export.product"), L("logistics.reports.deliveries"), L("logistics.reports.totalTons")],
      data.byProduct.map((r) => [r.label, r.deliveries, r.totalTons])));
    download(`logistics-report_${from}_${to}.csv`, blocks.join("\r\n"));
  }

  const tons = (v: number) => `${num(v)} t`;
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const tdr = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <div className="glass panel" style={{ padding: "12px 16px", minWidth: 140 }}>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
      </div>
    );
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{title}</h2>
      <div className="glass panel" style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );

  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } .print-only { display: block !important; } @page { size: A4 landscape; margin: 12mm; } .glass.panel { box-shadow: none !important; } }`}</style>
      <div className="print-only" style={{ display: "none", fontSize: 12, marginBottom: 8 }}>{from} – {to}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.fleet.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.reports.title")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("logistics.reports.intro")}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.reports.from")}<input type="date" style={{ ...sel, marginLeft: 6 }} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>{t("logistics.reports.to")}<input type="date" style={{ ...sel, marginLeft: 6 }} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("logistics.reports.allStatus")}</option>
          <option value="draft">{t("logistics.reports.status.draft")}</option>
          <option value="ready">{t("logistics.reports.status.ready")}</option>
          <option value="finalized">{t("logistics.reports.status.finalized")}</option>
          <option value="cancelled">{t("logistics.reports.status.cancelled")}</option>
        </select>
        {loading && <span style={{ fontSize: 12, color: "var(--muted)" }}>…</span>}
        <span className="no-print" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled={!data || data.totalDeliveries === 0} onClick={exportCsv}>{t("logistics.reports.exportCsv")}</button>
          <button className="btn btn-ghost btn-sm" disabled={!data} onClick={() => window.print()}>{t("logistics.reports.print")}</button>
        </span>
      </div>

      {data && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Stat label={t("logistics.reports.totalDeliveries")} value={String(data.totalDeliveries)} />
            <Stat label={t("logistics.fleet.bulk")} value={tons(data.volume.bulk.totalTons)} sub={`${data.volume.bulk.deliveries} ${t("logistics.reports.deliveriesShort")}`} />
            <Stat label={t("logistics.fleet.bags")} value={tons(data.volume.bags.totalTons)} sub={`${data.volume.bags.deliveries} ${t("logistics.reports.deliveriesShort")}`} />
            {data.volume.unknown.deliveries > 0 && <Stat label={t("logistics.reports.unknownCargo")} value={tons(data.volume.unknown.totalTons)} sub={`${data.volume.unknown.deliveries} ${t("logistics.reports.deliveriesShort")}`} />}
          </div>

          <Section title={t("logistics.reports.byCarrier")}>
            {data.byCarrier.length === 0 ? <Empty t={t} /> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>{t("logistics.fleet.carrier")}</th><th style={th}>{t("logistics.reports.deliveries")}</th><th style={th}>{t("logistics.reports.totalTons")}</th></tr></thead>
                <tbody>{data.byCarrier.map((r, i) => <tr key={i}><td style={tdr}>{r.label}</td><td style={tdr} className="num">{r.deliveries}</td><td style={tdr} className="num">{tons(r.totalTons)}</td></tr>)}</tbody>
              </table>
            )}
          </Section>

          <Section title={t("logistics.reports.byTruck")}>
            {data.byTruck.length === 0 ? <Empty t={t} /> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>{t("logistics.fleet.truck")}</th><th style={th}>{t("logistics.fleet.carrier")}</th><th style={th}>{t("logistics.reports.deliveries")}</th>
                  <th style={th}>{t("logistics.reports.totalTons")}</th><th style={th}>{t("logistics.reports.avgTons")}</th><th style={th}>{t("logistics.fleet.maxLoad")}</th><th style={th}>{t("logistics.reports.utilization")}</th>
                </tr></thead>
                <tbody>{data.byTruck.map((r, i) => (
                  <tr key={i}>
                    <td style={tdr} className="num">{r.label}</td><td style={tdr}>{r.carrierName ?? "—"}</td><td style={tdr} className="num">{r.deliveries}</td>
                    <td style={tdr} className="num">{tons(r.totalTons)}</td><td style={tdr} className="num">{tons(r.avgTons)}</td>
                    <td style={tdr} className="num">{r.maxPayloadTons != null ? tons(r.maxPayloadTons) : "—"}</td>
                    <td style={tdr} className="num">{r.utilizationPct != null ? <span style={{ color: r.utilizationPct > 100 ? "var(--brick)" : "inherit" }}>{r.utilizationPct}%</span> : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Section>

          <Section title={t("logistics.reports.byProduct")}>
            {data.byProduct.length === 0 ? <Empty t={t} /> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>{t("logistics.export.product")}</th><th style={th}>{t("logistics.reports.deliveries")}</th><th style={th}>{t("logistics.reports.totalTons")}</th></tr></thead>
                <tbody>{data.byProduct.map((r, i) => <tr key={i}><td style={tdr}>{r.label}</td><td style={tdr} className="num">{r.deliveries}</td><td style={tdr} className="num">{tons(r.totalTons)}</td></tr>)}</tbody>
              </table>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.reports.empty")}</div>;
}
