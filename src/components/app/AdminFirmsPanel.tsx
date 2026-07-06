"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

export type AdminFirmRow = {
  id: string; name: string; planLabel: string; maxClients: string;
  totalClients: number; startClients: number; paidClients: number;
  ratePercent: number; overridePercent: number | null; monthlyCommission: number;
  paidTotal: number; pendingRequests: number;
};
export type AdminPayoutRow = { id: string; firmId: string; firmName: string; amount: number; requestedAt: string };

export function AdminFirmsPanel({ firms, payouts }: { firms: AdminFirmRow[]; payouts: AdminPayoutRow[] }) {
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
    if (!confirm("Да отбележа ли тази комисионна като изплатена?")) return;
    await fetch(`/api/admin/payout/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    router.refresh();
  }
  async function viewClients(id: string) {
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    if (res.ok) window.location.href = "/firm";
  }

  if (!firms.length) return null;
  const totalClients = firms.reduce((s, f) => s + f.totalClients, 0);

  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Счетоводни къщи · Партньорска програма</h2>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 10 }}>{firms.length} къщи · {totalClients} клиентски фирми общо</div>

      <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto", marginBottom: payouts.length ? 16 : 0 }}>
        <table>
          <thead><tr>
            <th>Счетоводна къща</th><th>План</th><th className="num">Клиенти / лимит</th><th className="num">START</th><th className="num">Платени</th>
            <th className="num">Комисионна/мес</th><th>Процент</th><th className="num">Изплатена</th><th></th>
          </tr></thead>
          <tbody>
            {firms.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td>{f.planLabel}</td>
                <td className="num">{f.totalClients} / {f.maxClients}</td>
                <td className="num">{f.startClients}</td>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => viewClients(f.id)}>Клиенти →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payouts.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>Чакащи заявки за изплащане</h3>
          <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto" }}>
            <table>
              <thead><tr><th>Счетоводна къща</th><th className="num">Сума</th><th>Заявена</th><th></th></tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.firmName}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(p.requestedAt).toLocaleDateString("bg-BG")}</td>
                    <td style={{ textAlign: "right" }}><button className="btn btn-primary btn-sm" onClick={() => markPaid(p.id)}>Маркирай като изплатена</button></td>
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
