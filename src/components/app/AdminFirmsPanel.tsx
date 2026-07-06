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

  // Обобщени показатели за всички счетоводни къщи
  const agg = firms.reduce((a, f) => {
    a.clients += f.totalClients; a.start += f.startClients; a.paid += f.paidClients;
    a.monthly += f.monthlyCommission; a.paidOut += f.paidTotal; a.pending += f.pendingRequests;
    return a;
  }, { clients: 0, start: 0, paid: 0, monthly: 0, paidOut: 0, pending: 0 });
  const conversion = agg.clients ? Math.round((agg.paid / agg.clients) * 100) : 0;
  const pendingPayoutTotal = payouts.reduce((s, p) => s + p.amount, 0);

  const kpis = [
    { label: "Счетоводни къщи", value: String(firms.length), color: "var(--navy)" },
    { label: "Клиентски фирми (общо)", value: String(agg.clients), color: "var(--ink)" },
    { label: "Клиенти на СТАРТ", value: String(agg.start), color: "var(--brass)" },
    { label: "Платени клиенти", value: String(agg.paid), color: "var(--emerald-dark)" },
    { label: "Конверсия към платен", value: `${conversion}%`, color: "var(--navy)" },
    { label: "Комисионни/месец (очаквани)", value: formatCurrency(agg.monthly), color: "var(--brick)" },
    { label: "Комисионни/година (очаквани)", value: formatCurrency(agg.monthly * 12), color: "var(--brick)" },
    { label: "Изплатени комисионни", value: formatCurrency(agg.paidOut), color: "var(--emerald-dark)" },
    { label: "Чакащи заявки за изплащане", value: formatCurrency(pendingPayoutTotal), color: "var(--brass)" },
  ];

  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Счетоводни къщи · Партньорска програма</h2>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 12 }}>{firms.length} къщи · {agg.clients} клиентски фирми общо · {agg.paid} платени</div>

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
        <div className="glass panel" style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>Все още няма регистрирани счетоводни къщи.</div>
      ) : (
      <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto", marginBottom: payouts.length ? 16 : 0 }}>
        <table>
          <thead><tr>
            <th>Счетоводна къща</th><th>План</th><th className="num">Клиенти / лимит</th><th className="num">СТАРТ</th><th className="num">Платени</th>
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
      )}

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
