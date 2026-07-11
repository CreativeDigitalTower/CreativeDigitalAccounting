"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/constants";
import type { PartnerStats } from "@/lib/partner";
import { clientSummary, type EnrichedClient, type FirmOverview } from "@/lib/bi/firm";
import { BiKpiCard } from "@/components/bi/BiKpiCard";
import { HealthGauge } from "@/components/bi/HealthGauge";
import { InsightFeed } from "@/components/bi/InsightFeed";
import { BiIcon } from "@/components/bi/BiIcon";

export type FirmInvite = { id: string; email: string; name: string | null; status: string; createdAt: string };
export type FirmDeadline = { title: string; law: string; date: string; days: number };

const TONE: Record<string, { c: string; bg: string; label: string }> = {
  good: { c: "var(--emerald-dark)", bg: "rgba(15,138,106,.12)", label: "Отлично" },
  ok: { c: "var(--navy)", bg: "var(--navy-soft)", label: "Добро" },
  attention: { c: "var(--brass)", bg: "var(--brass-soft)", label: "Внимание" },
  critical: { c: "var(--brick)", bg: "var(--brick-soft)", label: "Критично" },
};
const money = (v: number) => Math.round(v).toLocaleString("bg-BG") + " €";
const actLabel = (d: number | null) => d == null ? "—" : d === 0 ? "днес" : d === 1 ? "вчера" : `преди ${d} дни`;

export function FirmDashboard({ firmName, firmId, paid, clients, invites, overview, deadlines, maxClients, partner }: {
  firmName: string; firmId: string; paid: boolean; clients: EnrichedClient[]; invites: FirmInvite[];
  overview: FirmOverview; deadlines: FirmDeadline[]; maxClients: number | null; partner: PartnerStats;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [details, setDetails] = useState<EnrichedClient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? clients.filter((c) => c.name.toLowerCase().includes(s) || (c.eik ?? "").includes(s)) : clients;
    return [...list].sort((a, b) => a.health - b.health); // проблемните най-отгоре
  }, [q, clients]);

  async function enter(id: string) {
    setBusyId(id);
    const res = await fetch("/api/firm/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.redirect) { router.push(data.redirect); router.refresh(); } else setBusyId(null);
  }
  function copyLink() { if (!partner.referralLink) return; navigator.clipboard?.writeText(partner.referralLink); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  async function requestPayout() {
    setPayoutMsg("");
    const res = await fetch("/api/firm/payout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setPayoutMsg(`Заявката за ${data.amount?.toFixed?.(2) ?? ""} € е изпратена.`); router.refresh(); } else setPayoutMsg(data.error ?? "Грешка.");
  }
  async function inviteAction(id: string, action: "resend" | "cancel") {
    await fetch(`/api/firm/invite/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    router.refresh();
  }

  const openInvites = invites.filter((i) => i.status === "invited").length;
  const atLimit = maxClients != null && (clients.length + openInvites) >= maxClients;
  const dist = overview.healthDist;
  const distTotal = Math.max(1, dist.good + dist.ok + dist.attention + dist.critical);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div className="bi-eyebrow">Счетоводна къща</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "2px 0 0" }}>Обзор на всички клиенти</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{firmName}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => enter(firmId)}>Моята фирма →</button>
          <button className="btn btn-ghost" onClick={() => setInviteOpen(true)} disabled={atLimit || !paid} title={!paid ? "След потвърждение на плащане" : undefined}>✉ Покани клиент</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)} disabled={atLimit || !paid} title={!paid ? "След потвърждение на плащане" : undefined}>+ Добави клиент</button>
        </div>
      </div>

      {!paid && (
        <div className="panel bi-in" style={{ padding: "14px 18px", marginBottom: 18, background: "var(--brass-soft)", border: "1px solid var(--brass)", borderRadius: 12, fontSize: 13 }}>
          <strong style={{ color: "var(--brass)" }}>Очаква се потвърждение на плащане.</strong> Функциите за добавяне и покана на клиенти ще се активират след потвърждение на плащането за плана Ви.
        </div>
      )}

      {/* KPI карти */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 14, marginBottom: 16 }}>
        {overview.cards.map((c, i) => <BiKpiCard key={c.key} card={c} index={i} />)}
      </div>

      {/* Здраве на портфейла + Прогноза + Партньор */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) minmax(0,1.1fr) minmax(240px,1fr)", gap: 14, marginBottom: 16 }} className="bi-overview-main">
        <div className="bi-card bi-flat bi-in">
          <div className="bi-eyebrow" style={{ color: "var(--emerald-dark)", marginBottom: 12 }}>Здраве на клиентския портфейл</div>
          {(["good", "ok", "attention", "critical"] as const).map((t) => (
            <div key={t} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className={`bi-dot ${t}`} />{TONE[t].label}</span>
                <span className="num" style={{ fontWeight: 700 }}>{dist[t]}</span>
              </div>
              <div style={{ height: 8, background: "rgba(20,30,25,.06)", borderRadius: 4, overflow: "hidden" }}>
                <div className="bi-sweep" style={{ height: "100%", width: `${(dist[t] / distTotal) * 100}%`, background: TONE[t].c, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bi-card bi-flat bi-in">
          <div className="bi-eyebrow" style={{ color: "var(--navy)", marginBottom: 10 }}>Прогноза за месеца (всички клиенти)</div>
          {overview.forecast ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { l: "Очакван оборот", v: money(overview.forecast.revenue), c: "var(--emerald-dark)" },
                { l: "Очаквани разходи", v: money(overview.forecast.expenses), c: "var(--brick)" },
                { l: "Очаквана печалба", v: money(overview.forecast.profit), c: overview.forecast.profit >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
                { l: "Очакван ДДС", v: money(overview.forecast.vat), c: "var(--brass)" },
              ].map((f) => (
                <div key={f.l}><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{f.l}</div><div className="num" style={{ fontSize: 18, fontWeight: 700, color: f.c }}>{f.v}</div></div>
              ))}
              <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--muted)" }}>при текущия темп · изминали {overview.forecast.progressPct}% от месеца</div>
            </div>
          ) : <div style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>Все още няма достатъчно данни за прогноза.</div>}
        </div>

        {/* Партньорска програма (интерактивна) */}
        <div id="partner" className="bi-card bi-flat bi-in" style={{ borderLeft: "3px solid var(--brass)" }}>
          <div className="bi-eyebrow" style={{ color: "var(--brass)", marginBottom: 8 }}>Партньорска програма · {partner.ratePercent}%</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { l: "Месечна", v: money(partner.monthlyCommission) },
              { l: "Годишна (очаквана)", v: money(partner.yearlyCommission) },
              { l: "Изплатена", v: money(partner.paidTotal) },
              { l: "Налична за заявка", v: money(partner.availableBalance) },
            ].map((s) => <div key={s.l}><div style={{ fontSize: 10.5, color: "var(--muted)" }}>{s.l}</div><div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{s.v}</div></div>)}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={requestPayout} disabled={!partner.canRequestPayout} title={!partner.canRequestPayout ? `Минимум ${partner.threshold} €` : undefined}>Заяви изплащане</button>
            {payoutMsg && <span style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 600 }}>{payoutMsg}</span>}
          </div>
          {partner.referralLink && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input readOnly value={partner.referralLink} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, fontSize: 11, padding: "6px 8px", background: "rgba(255,255,255,.6)" }} />
              <button className="btn btn-primary btn-sm" onClick={copyLink}>{copied ? "✓" : "Копирай"}</button>
            </div>
          )}
        </div>
      </div>

      {/* Task Center — Изисква внимание */}
      <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16, borderLeft: "3px solid var(--brass)" }}>
        <div className="bi-eyebrow" style={{ color: "var(--brass)", marginBottom: 6 }}>Изисква внимание</div>
        <div>
          {overview.tasks.map((t, i) => (
            <div key={i} className="bi-insight">
              <span className={`bi-dot ${t.severity}`} style={{ marginTop: 5 }} />
              <span className="ico"><BiIcon name={t.icon} size={15} /></span>
              <span style={{ fontSize: 12.7, color: "var(--ink-soft)", lineHeight: 1.5, flex: 1 }}>{t.text}</span>
              {t.clientId ? <button onClick={() => enter(t.clientId!)} className="btn btn-ghost btn-sm" style={{ padding: "3px 10px" }}>Отиди →</button>
                : t.href ? <Link href={t.href} className="btn btn-ghost btn-sm" style={{ padding: "3px 10px" }}>{t.cta} →</Link> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Insights + Възможности */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 16 }}>
        <InsightFeed title="Управленски изводи" items={overview.insights} eyebrowColor="var(--emerald-dark)" />
        <InsightFeed title="Възможности за надграждане" items={overview.opportunities} eyebrowColor="var(--brass)" />
      </div>

      {/* Наближаващи срокове */}
      {deadlines.length > 0 && (
        <div className="bi-card bi-flat bi-in" style={{ marginBottom: 16 }}>
          <div className="bi-eyebrow" style={{ color: "var(--navy)", marginBottom: 8 }}>Наближаващи срокове</div>
          <div>
            {deadlines.map((d, i) => (
              <div key={i} className="bi-insight">
                <span className={`bi-dot ${d.days <= 3 ? "critical" : d.days <= 7 ? "attention" : "ok"}`} style={{ marginTop: 5 }} />
                <span style={{ fontSize: 12.7, color: "var(--ink-soft)", flex: 1 }}>{d.title} <span style={{ color: "var(--muted)" }}>· {d.law}</span></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.days <= 3 ? "var(--brick)" : "var(--ink-soft)", whiteSpace: "nowrap" }}>{new Date(d.date).toLocaleDateString("bg-BG")} · {d.days} дни</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Покани в изчакване */}
      {invites.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="bi-eyebrow" style={{ marginBottom: 8 }}>Покани</div>
          <div className="glass panel bi-table" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Имейл</th><th>Име</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.email}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{i.name ?? "—"}</td>
                    <td><span style={{ fontSize: 10.5, fontWeight: 700, color: i.status === "accepted" ? "var(--emerald-dark)" : "var(--brass)", background: i.status === "accepted" ? "rgba(15,138,106,.12)" : "var(--brass-soft)", borderRadius: 8, padding: "1px 8px" }}>{i.status === "accepted" ? "Приета" : "Поканена"}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {i.status === "invited" && <>
                        <button className="btn btn-ghost btn-sm" onClick={() => inviteAction(i.id, "resend")}>Изпрати пак</button>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, color: "var(--brick)" }} onClick={() => inviteAction(i.id, "cancel")}>Отмени</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Списък клиенти */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>Клиентски фирми</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Търси по име или ЕИК…" style={{ marginLeft: "auto", width: "auto", minWidth: 240, fontSize: 13, padding: "7px 12px" }} />
      </div>

      {clients.length === 0 ? (
        <div className="bi-card bi-flat" style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Още нямате добавени клиентски фирми.</div>
          <div style={{ fontSize: 12.5 }}>Поканете клиент по имейл или го добавете директно — всеки получава безплатен СТАРТ достъп.</div>
        </div>
      ) : (
        <div className="glass panel bi-table" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead><tr><th>Фирма</th><th>Здраве</th><th>План</th><th className="num">Приходи</th><th className="num">Печалба</th><th className="num">Просрочени</th><th>Активност</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const t = TONE[c.healthTone];
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}<div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{c.eik ?? "—"}{c.city ? ` · ${c.city}` : ""}</div></td>
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: t.c, background: t.bg, borderRadius: 20, padding: "2px 9px" }}><span className="num">{c.health}</span> {t.label}</span></td>
                    <td style={{ fontSize: 12.5 }}>{c.planLabel}</td>
                    <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(c.revenue)}</td>
                    <td className="num" style={{ color: c.profit >= 0 ? "var(--ink)" : "var(--brick)", fontWeight: 600 }}>{formatCurrency(c.profit)}</td>
                    <td className="num" style={{ color: c.overdue ? "var(--brick)" : "var(--muted)", fontWeight: c.overdue ? 700 : 400 }}>{c.overdue || "—"}</td>
                    <td style={{ fontSize: 12, color: c.lastActivityDays != null && c.lastActivityDays > 30 ? "var(--brick)" : "var(--ink-soft)" }}>{actLabel(c.lastActivityDays)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetails(c)}>Детайли</button>
                      <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} onClick={() => enter(c.id)} disabled={busyId === c.id}>{busyId === c.id ? "…" : "Влез →"}</button>
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
      {details && <ClientDetailsModal client={details} onClose={() => setDetails(null)} onEnter={() => enter(details.id)} />}
    </div>
  );
}

function ClientDetailsModal({ client, onClose, onEnter }: { client: EnrichedClient; onClose: () => void; onEnter: () => void }) {
  const t = TONE[client.healthTone];
  const summary = clientSummary(client);
  const nums = [
    { l: "Приходи (год.)", v: formatCurrency(client.revenue) },
    { l: "Разходи (год.)", v: formatCurrency(client.expenses) },
    { l: "Печалба", v: formatCurrency(client.profit) },
    { l: "Документи", v: String(client.docs) },
    { l: "Неплатени", v: formatCurrency(client.unpaid) },
    { l: "Просрочени", v: String(client.overdue) },
  ];
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "6vh 16px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="panel" style={{ width: "min(520px, 100%)", padding: 24, margin: "auto", background: "#FBFAF6", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 24px 60px rgba(20,30,25,.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, margin: 0 }}>{client.name}</h3>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{client.eik ?? "—"}{client.city ? ` · ${client.city}` : ""} · {client.planLabel}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.c, background: t.bg, borderRadius: 20, padding: "3px 11px", whiteSpace: "nowrap" }}>Здраве {client.health} · {t.label}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}><HealthGauge score={client.health} tone={client.healthTone} size={150} /></div>

        <div className="bi-eyebrow" style={{ marginBottom: 6 }}>Кратко резюме</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 5 }}>
          {summary.map((s, i) => <li key={i} style={{ fontSize: 12.7, color: "var(--ink-soft)", paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--emerald)" }}>–</span>{s}</li>)}
        </ul>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {nums.map((n) => <div key={n.l}><div style={{ fontSize: 10.5, color: "var(--muted)" }}>{n.l}</div><div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{n.v}</div></div>)}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Затвори</button>
          <button className="btn btn-primary btn-sm" onClick={onEnter}>Влез във фирмата →</button>
        </div>
      </div>
    </div>,
    document.body
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
      <div onClick={(e) => e.stopPropagation()} className="panel" style={{ width: "min(460px, 100%)", padding: 24, background: "#FBFAF6", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 24px 60px rgba(20,30,25,.28)" }}>
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
      <div onClick={(e) => e.stopPropagation()} className="panel" style={{ width: "min(560px, 100%)", padding: 24, margin: "auto", background: "#FBFAF6", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 24px 60px rgba(20,30,25,.28)" }}>
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
