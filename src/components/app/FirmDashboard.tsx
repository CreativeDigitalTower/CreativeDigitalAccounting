"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/constants";
import type { PartnerStats } from "@/lib/partner";

export type FirmClient = {
  id: string; name: string; eik: string | null; vatRegistered: boolean; city: string | null;
  planLabel: string; status: "active" | "inactive" | "paid";
  revenue: number; expenses: number; docs: number;
};
export type FirmInvite = { id: string; email: string; name: string | null; status: string; createdAt: string };
type Totals = { clients: number; revenue: number; expenses: number; docs: number; vatRegistered: number };

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Платен план", color: "var(--emerald-dark)", bg: "rgba(15,138,106,.12)" },
  active: { label: "Активна (СТАРТ)", color: "var(--navy)", bg: "var(--navy-soft)" },
  inactive: { label: "Неактивна", color: "var(--muted)", bg: "rgba(138,133,120,.14)" },
  invited: { label: "Поканена", color: "var(--brass)", bg: "var(--brass-soft)" },
};

export function FirmDashboard({ firmName, clients, invites, totals, maxClients, partner }: {
  firmName: string; clients: FirmClient[]; invites: FirmInvite[]; totals: Totals; maxClients: number | null; partner: PartnerStats;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");

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
  function copyLink() {
    if (!partner.referralLink) return;
    navigator.clipboard?.writeText(partner.referralLink);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  async function requestPayout() {
    setPayoutMsg("");
    const res = await fetch("/api/firm/payout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setPayoutMsg(`Заявката за ${data.amount?.toFixed?.(2) ?? ""} € е изпратена.`); router.refresh(); }
    else setPayoutMsg(data.error ?? "Грешка.");
  }
  async function inviteAction(id: string, action: "resend" | "cancel") {
    await fetch(`/api/firm/invite/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    router.refresh();
  }

  const atLimit = maxClients != null && (totals.clients + invites.filter((i) => i.status === "invited").length) >= maxClients;
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setInviteOpen(true)} disabled={atLimit}>✉ Покани клиент</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)} disabled={atLimit} title={atLimit ? "Достигнат лимит за плана" : undefined}>+ Добави клиентска фирма</button>
        </div>
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

      {/* ── Партньорска програма ── */}
      <div className="glass panel" style={{ padding: "20px 22px", marginBottom: 22, borderLeft: "4px solid var(--brass)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, margin: 0 }}>Партньорска програма</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 10, padding: "1px 8px" }}>Комисионна {partner.ratePercent}%</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 16px", maxWidth: 760, lineHeight: 1.55 }}>
          Всеки Ваш клиент получава безплатен <strong>СТАРТ</strong> достъп до Creative Digital Accounting. Ако надгради към платен план, Вие получавате партньорска комисионна.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Общо поканени клиенти", value: String(partner.totalClients) },
            { label: "Клиенти на СТАРТ", value: String(partner.startClients) },
            { label: "Клиенти на платен план", value: String(partner.paidClients) },
            { label: "Конверсия", value: `${partner.conversion}%` },
            { label: "Комисионна този месец", value: formatCurrency(partner.monthlyCommission) },
            { label: "Очаквана годишна", value: formatCurrency(partner.yearlyCommission) },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,.5)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Комисионни за изплащане */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", marginBottom: 14, fontSize: 12.5 }}>
          <span>Изплатена комисионна: <strong className="num">{formatCurrency(partner.paidTotal)}</strong></span>
          <span>Чакащи заявки: <strong className="num">{formatCurrency(partner.pendingRequests)}</strong></span>
          <span>Налична за заявка: <strong className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(partner.availableBalance)}</strong></span>
          <button className="btn btn-ghost btn-sm" onClick={requestPayout} disabled={!partner.canRequestPayout} title={!partner.canRequestPayout ? `Минимум ${partner.threshold} € за заявка` : undefined}>
            Заяви изплащане
          </button>
          {payoutMsg && <span style={{ color: "var(--emerald-dark)", fontWeight: 600 }}>{payoutMsg}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>Комисионна се изплаща при достигнат праг от {partner.threshold} € — заявката се обработва от екипа ни. Нивата са 10% (до 20 платени), 15% (21–50), 20% (над 50).</div>

        {/* Реферал линк */}
        {partner.referralLink && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input readOnly value={partner.referralLink} style={{ flex: 1, minWidth: 240, padding: "8px 12px", fontSize: 12.5, background: "rgba(255,255,255,.6)" }} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn btn-primary btn-sm" onClick={copyLink}>{copied ? "Копирано ✓" : "Копирай линк"}</button>
          </div>
        )}
      </div>

      {/* Покани в изчакване */}
      {invites.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>Покани</h2>
          <div className="glass panel" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Имейл</th><th>Име</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {invites.map((i) => {
                  const b = i.status === "accepted" ? STATUS_BADGE.paid : STATUS_BADGE.invited;
                  return (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 600 }}>{i.email}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{i.name ?? "—"}</td>
                      <td><span style={{ fontSize: 10.5, fontWeight: 700, color: b.color, background: b.bg, borderRadius: 8, padding: "1px 8px" }}>{i.status === "accepted" ? "Приета" : "Поканена"}</span></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {i.status === "invited" && <>
                          <button className="btn btn-ghost btn-sm" onClick={() => inviteAction(i.id, "resend")}>Изпрати пак</button>
                          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, color: "var(--brick)" }} onClick={() => inviteAction(i.id, "cancel")}>Отмени</button>
                        </>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          <div style={{ fontSize: 12.5 }}>Поканете клиент по имейл или го добавете директно — всеки получава безплатен СТАРТ достъп.</div>
        </div>
      ) : (
        <div className="glass panel" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Фирма</th><th>Статус</th><th>План</th><th className="num">Приходи (год.)</th><th className="num">Разходи (год.)</th><th className="num">Док.</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const b = STATUS_BADGE[c.status];
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}{c.city ? <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}> · {c.city}</span> : null}</td>
                    <td><span style={{ fontSize: 10.5, fontWeight: 700, color: b.color, background: b.bg, borderRadius: 8, padding: "1px 8px" }}>{b.label}</span></td>
                    <td style={{ fontSize: 12.5 }}>{c.planLabel}</td>
                    <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(c.revenue)}</td>
                    <td className="num" style={{ color: "var(--brick)" }}>{formatCurrency(c.expenses)}</td>
                    <td className="num">{c.docs}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => enter(c.id)} disabled={busyId === c.id}>{busyId === c.id ? "…" : "Влез →"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddClientModal onClose={() => setAddOpen(false)} onCreated={(id, enterNow) => { setAddOpen(false); if (enterNow) enter(id); else router.refresh(); }} />}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSent={() => { setInviteOpen(false); router.refresh(); }} />}
    </div>
  );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    if (!email.trim()) { setErr("Въведете имейл."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/firm/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) onSent(); else setErr(data.error ?? "Грешка при изпращане.");
  }
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "10vh 16px 16px" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(460px, 100%)", padding: 24 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 6px" }}>Покани клиент</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>Клиентът получава имейл с покана и безплатен СТАРТ достъп.</p>
        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label>Имейл на клиента *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" /></div>
          <div><label>Име (по избор)</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Отказ</button>
          <button className="btn btn-primary btn-sm" onClick={send} disabled={busy}>{busy ? "…" : "Изпрати покана"}</button>
        </div>
      </div>
    </div>,
    document.body
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
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 4px" }}>Нова клиентска фирма</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>Фирмата получава безплатен СТАРТ достъп.</p>
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
