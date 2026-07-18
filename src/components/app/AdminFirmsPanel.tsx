"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, ACCOUNTANT_PLANS } from "@/lib/constants";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

export type AdminFirmRow = {
  id: string; name: string; planLabel: string; firmPlan: string; paymentStatus: string; maxClients: string;
  totalClients: number; startClients: number; paidClients: number;
  ratePercent: number; overridePercent: number | null; monthlyCommission: number;
  paidTotal: number; pendingRequests: number;
};
export type AdminPayoutRow = { id: string; firmId: string; firmName: string; amount: number; requestedAt: string };

export function AdminFirmsPanel({ firms, payouts }: { firms: AdminFirmRow[]; payouts: AdminPayoutRow[] }) {
  const t = useT();
  const { locale, messages } = useI18n();
  const firmPlanName = (id: string) => (messages as unknown as { pricing: { firmPlans: Record<string, { name: string }> } }).pricing.firmPlans[id]?.name ?? id;
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [pct, setPct] = useState("");
  const [busy, setBusy] = useState(false);

  async function savePercent(id: string) {
    setBusy(true);
    const val = pct.trim() === "" ? null : Number(pct);
    await fetch(`/api/admin/firm/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerPercentOverride: val }) });
    setBusy(false); setEditId(null); router.refresh();
  }
  async function markPaid(id: string) {
    if (!confirm(t("admintools.firms.confirmMarkPaid"))) return;
    await fetch(`/api/admin/payout/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    router.refresh();
  }
  async function setPlan(id: string, firmPlan: string) {
    await fetch(`/api/admin/firm/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firmPlan }) });
    router.refresh();
  }
  async function setPayment(id: string, paymentStatus: string) {
    await fetch(`/api/admin/firm/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus }) });
    router.refresh();
  }
  async function viewClients(id: string) {
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    if (res.ok) window.location.href = "/firm";
  }

  // Обобщени показатели за всички счетоводни къщи
  const agg = firms.reduce((a, f) => {
    a.clients += f.totalClients; a.start += f.startClients; a.paid += f.paidClients;
    a.monthly += f.monthlyCommission; a.paidOut += f.paidTotal; a.pending += f.pendingRequests;
    return a;
  }, { clients: 0, start: 0, paid: 0, monthly: 0, paidOut: 0, pending: 0 });
  const conversion = agg.clients ? Math.round((agg.paid / agg.clients) * 100) : 0;
  const pendingPayoutTotal = payouts.reduce((s, p) => s + p.amount, 0);

  const kpis = [
    { label: t("admintools.firms.kpiFirms"), value: String(firms.length), color: "var(--navy)" },
    { label: t("admintools.firms.kpiClients"), value: String(agg.clients), color: "var(--ink)" },
    { label: t("admintools.firms.kpiStart"), value: String(agg.start), color: "var(--brass)" },
    { label: t("admintools.firms.kpiPaid"), value: String(agg.paid), color: "var(--emerald-dark)" },
    { label: t("admintools.firms.kpiConversion"), value: `${conversion}%`, color: "var(--navy)" },
    { label: t("admintools.firms.kpiCommMonth"), value: formatCurrency(agg.monthly), color: "var(--brick)" },
    { label: t("admintools.firms.kpiCommYear"), value: formatCurrency(agg.monthly * 12), color: "var(--brick)" },
    { label: t("admintools.firms.kpiPaidOut"), value: formatCurrency(agg.paidOut), color: "var(--emerald-dark)" },
    { label: t("admintools.firms.kpiPendingPayouts"), value: formatCurrency(pendingPayoutTotal), color: "var(--brass)" },
  ];

  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{t("admintools.firms.title")}</h2>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 12 }}>{t("admintools.firms.subtitle", { n: firms.length, clients: agg.clients, paid: agg.paid })}</div>

      {/* Обобщени показатели */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {firms.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>{t("admintools.firms.empty")}</div>
      ) : (
      <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto", marginBottom: payouts.length ? 16 : 0 }}>
        <table>
          <thead><tr>
            <th>{t("admintools.firms.thFirm")}</th><th>{t("admintools.firms.thSubscription")}</th><th>{t("admintools.firms.thPayment")}</th><th className="num">{t("admintools.firms.thClientsLimit")}</th><th className="num">{t("admintools.firms.thPaid")}</th>
            <th className="num">{t("admintools.firms.thCommMonth")}</th><th>{t("admintools.firms.thPercent")}</th><th className="num">{t("admintools.firms.thPaidOut")}</th><th></th>
          </tr></thead>
          <tbody>
            {firms.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td>
                  <select value={f.firmPlan} onChange={(e) => setPlan(f.id, e.target.value)} style={{ fontSize: 12, padding: "3px 6px" }}>
                    {ACCOUNTANT_PLANS.map((p) => <option key={p.id} value={p.id}>{firmPlanName(p.id)}</option>)}
                  </select>
                </td>
                <td>
                  {f.paymentStatus === "received"
                    ? <button onClick={() => setPayment(f.id, "pending")} title={t("admintools.firms.cancelConfirmTitle")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--emerald-dark)" }}>{t("admintools.firms.paidBtn")}</button>
                    : <button onClick={() => setPayment(f.id, "received")} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>{t("admintools.firms.confirmPayment")}</button>}
                </td>
                <td className="num">{f.totalClients} / {f.maxClients}</td>
                <td className="num" style={{ fontWeight: 700, color: "var(--emerald-dark)" }}>{f.paidClients}</td>
                <td className="num">{formatCurrency(f.monthlyCommission)}</td>
                <td>
                  {editId === f.id ? (
                    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                      <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder={String(f.ratePercent)} style={{ width: 52, padding: "3px 6px", fontSize: 12 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => savePercent(f.id)} disabled={busy}>OK</button>
                    </span>
                  ) : (
                    <button onClick={() => { setEditId(f.id); setPct(f.overridePercent != null ? String(f.overridePercent) : ""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--navy)", fontWeight: 700 }}>
                      {f.ratePercent}%{f.overridePercent != null ? " *" : ""} ✎
                    </button>
                  )}
                </td>
                <td className="num">{formatCurrency(f.paidTotal)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => viewClients(f.id)}>{t("admintools.firms.clients")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {payouts.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{t("admintools.firms.payoutsTitle")}</h3>
          <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
            <table>
              <thead><tr><th>{t("admintools.firms.pThFirm")}</th><th className="num">{t("admintools.firms.pThAmount")}</th><th>{t("admintools.firms.pThRequested")}</th><th></th></tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.firmName}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(p.requestedAt).toLocaleDateString(locale)}</td>
                    <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-sm" onClick={() => markPaid(p.id)}>{t("admintools.firms.markPaid")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
