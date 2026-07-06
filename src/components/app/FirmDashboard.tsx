"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/constants";

export type FirmClient = {
  id: string; name: string; eik: string | null; vatRegistered: boolean; city: string | null;
  revenue: number; expenses: number; docs: number;
};
type Totals = { clients: number; revenue: number; expenses: number; docs: number; vatRegistered: number };

export function FirmDashboard({ firmName, clients, totals, maxClients }: {
  firmName: string; clients: FirmClient[]; totals: Totals; maxClients: number | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s) || (c.eik ?? "").includes(s));
  }, [q, clients]);

  async function enter(id: string) {
    setBusyId(id);
    const res = await fetch("/api/firm/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.redirect) { router.push(data.redirect); router.refresh(); }
    else setBusyId(null);
  }

  const atLimit = maxClients != null && totals.clients >= maxClients;
  const profit = totals.revenue - totals.expenses;

  const kpis = [
    { label: "Клиентски фирми", value: `${totals.clients}${maxClients != null ? ` / ${maxClients}` : ""}`, color: "var(--navy)" },
    { label: "Общо приходи (тази година)", value: formatCurrency(totals.revenue), color: "var(--emerald-dark)" },
    { label: "Общо разходи (тази година)", value: formatCurrency(totals.expenses), color: "var(--brick)" },
    { label: "Обща печалба", value: formatCurrency(profit), color: profit >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
    { label: "Регистрирани по ДДС", value: `${totals.vatRegistered} / ${totals.clients}`, color: "var(--brass)" },
    { label: "Общо документи", value: String(totals.docs), color: "var(--ink)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: "0 0 3px" }}>Табло на счетоводната къща</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Обобщен преглед на всички фирми, за които {firmName} води счетоводство.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)} disabled={atLimit} title={atLimit ? "Достигнат лимит за плана" : undefined}>+ Добави клиентска фирма</button>
      </div>

      {/* Обобщени KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {atLimit && (
        <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 16, borderLeft: "4px solid var(--brass)", background: "var(--brass-soft)", fontSize: 12.5 }}>
          Достигнахте лимита от {maxClients} клиентски фирми за текущия план. За повече фирми надградете тарифата от <strong>Абонамент</strong>.
        </div>
      )}

      {/* Търсене + списък клиенти */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>Клиентски фирми</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Търси по име или ЕИК…" style={{ marginLeft: "auto", padding: "7px 12px", fontSize: 13, minWidth: 240 }} />
      </div>

      {clients.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Още нямате добавени клиентски фирми.</div>
          <div style={{ fontSize: 12.5 }}>Натиснете „+ Добави клиентска фирма“, за да започнете да водите счетоводството ѝ.</div>
        </div>
      ) : (
        <div className="glass panel" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Фирма</th><th>ЕИК</th><th>ДДС</th><th className="num">Приходи (год.)</th><th className="num">Разходи (год.)</th><th className="num">Документи</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}{c.city ? <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}> · {c.city}</span> : null}</td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{c.eik ?? "—"}</td>
                  <td>{c.vatRegistered ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--emerald-dark)", background: "rgba(15,138,106,.12)", borderRadius: 8, padding: "1px 7px" }}>Регистрирана</span> : <span style={{ fontSize: 10.5, color: "var(--muted)" }}>Без ДДС</span>}</td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(c.revenue)}</td>
                  <td className="num" style={{ color: "var(--brick)" }}>{formatCurrency(c.expenses)}</td>
                  <td className="num">{c.docs}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => enter(c.id)} disabled={busyId === c.id}>{busyId === c.id ? "…" : "Влез →"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddClientModal onClose={() => setAddOpen(false)} onCreated={(id, enterNow) => { setAddOpen(false); if (enterNow) enter(id); else router.refresh(); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, enterNow: boolean) => void }) {
  const [f, setF] = useState({ name: "", eik: "", vatRegistered: false, vatNumber: "", address: "", city: "", mol: "", phone: "", email: "", sector: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(enterNow: boolean) {
    if (!f.name.trim()) { setErr("Въведете име на фирмата."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/firm/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.companyId) onCreated(data.companyId, enterNow);
    else setErr(data.error ?? "Грешка при създаване.");
  }

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "6vh 16px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(560px, 100%)", padding: 24, margin: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 14px" }}>Нова клиентска фирма</h3>
        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label>Име на фирмата *</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label>ЕИК / БУЛСТАТ</label><input value={f.eik} onChange={(e) => setF({ ...f, eik: e.target.value })} placeholder="по избор" /></div>
          <div><label>Град</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Адрес</label><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><label>МОЛ</label><input value={f.mol} onChange={(e) => setF({ ...f, mol: e.target.value })} /></div>
          <div><label>Телефон</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Имейл</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
            <input id="vatReg" type="checkbox" checked={f.vatRegistered} onChange={(e) => setF({ ...f, vatRegistered: e.target.checked })} style={{ width: "auto" }} />
            <label htmlFor="vatReg" style={{ margin: 0 }}>Регистрирана по ЗДДС</label>
          </div>
          {f.vatRegistered && <div style={{ gridColumn: "1 / -1" }}><label>ДДС номер</label><input value={f.vatNumber} onChange={(e) => setF({ ...f, vatNumber: e.target.value })} placeholder="BG…" /></div>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Отказ</button>
          <button className="btn btn-ghost btn-sm" onClick={() => save(false)} disabled={busy}>Създай</button>
          <button className="btn btn-primary btn-sm" onClick={() => save(true)} disabled={busy}>{busy ? "…" : "Създай и влез"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
