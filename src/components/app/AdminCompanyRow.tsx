"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  { id: "free", label: "Безплатен" },
  { id: "start", label: "Старт" },
  { id: "business", label: "Бизнес" },
  { id: "pro", label: "Про" },
];

type Props = {
  id: string;
  name: string;
  eik: string | null;
  plan: string;
  status: string;
  users: number;
  docs: number;
  createdAt: string;
  lastActivity: string | null;
  owners: string;
  details: {
    vatNumber: string | null; address: string | null; city: string | null;
    mol: string | null; sector: string | null; phone: string | null; email: string | null;
  };
  members: {
    name: string | null; email: string; representativeRole: string | null; role: string;
    marketingConsent: boolean; termsAcceptedAt: string | null; createdAt: string;
  }[];
  sub: { status: string; paymentStatus: string; periodStart: string | null; periodEnd: string | null; trialUsed: boolean };
  events: { type: string; plan: string | null; status: string | null; period: string | null; amount: number | null; note: string | null; createdAt: string }[];
};

const EVENT_LABEL: Record<string, string> = {
  request: "Заявка за плащане", payment: "Получено плащане", plan_change: "Смяна на план",
  status_change: "Промяна на статус", trial: "Пробен период", expiry: "Изтекъл → Безплатен",
};
const EVENT_COLOR: Record<string, string> = {
  request: "var(--brass)", payment: "var(--emerald)", plan_change: "var(--navy)",
  status_change: "var(--navy)", trial: "var(--brass)", expiry: "var(--brick)",
};
// Статус на плащане — само „received" се брои като продаден абонамент в статистиката
const PAY_OPTS = [
  { id: "received", label: "Получено плащане" },
  { id: "pending", label: "Изчаква се плащане" },
  { id: "not_received", label: "Не е получено плащане" },
];
const ROLE_BG: Record<string, string> = {
  owner: "Собственик", manager: "Мениджър", accountant: "Счетоводител", sales: "Продажби",
  warehouse: "Склад", viewer: "Преглед", employee: "Служител",
};

// Цветова индикация за активност: зелено ≤14 дни, жълто 15–30, червено >30, сиво — никога
function activityBadge(iso: string | null): { color: string; bg: string; label: string } {
  if (!iso) return { color: "var(--muted)", bg: "rgba(120,120,110,.12)", label: "няма активност" };
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const label = days === 0 ? "днес" : days === 1 ? "вчера" : `преди ${days} дни`;
  if (days <= 14) return { color: "var(--emerald-dark)", bg: "rgba(15,138,106,.14)", label };
  if (days <= 30) return { color: "var(--brass)", bg: "var(--brass-soft)", label };
  return { color: "var(--brick)", bg: "var(--brick-soft)", label };
}

const PAY_META: Record<string, { color: string }> = {
  received: { color: "var(--emerald)" }, pending: { color: "var(--brass)" }, not_received: { color: "var(--brick)" },
};

export function AdminCompanyRow(props: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(props.plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  // Управление на абонаментния период
  const [mPlan, setMPlan] = useState(props.plan);
  const [mStart, setMStart] = useState(props.sub.periodStart?.slice(0, 10) ?? "");
  const [mEnd, setMEnd] = useState(props.sub.periodEnd?.slice(0, 10) ?? "");
  const [mStatus, setMStatus] = useState(props.sub.status);
  const [pay, setPay] = useState(props.sub.paymentStatus);
  const [subMsg, setSubMsg] = useState("");

  async function saveSubscription() {
    setSubMsg("");
    const res = await fetch("/api/admin/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id, plan: mPlan, status: mStatus, paymentStatus: pay, periodStart: mStart || null, periodEnd: mEnd || null }),
    });
    if (res.ok) { setSubMsg("✓ Запазено"); setPlan(mPlan); router.refresh(); setTimeout(() => setSubMsg(""), 2500); }
    else setSubMsg((await res.json()).error ?? "Грешка");
  }

  // Бърза промяна на статуса на плащане директно (потвърждение на реален приход)
  async function changePayment(next: string) {
    setPay(next);
    const res = await fetch("/api/admin/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id, plan, paymentStatus: next }),
    });
    if (res.ok) router.refresh();
  }

  async function changePlan(next: string) {
    setSaving(true);
    setSaved(false);
    setPlan(next);
    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id, plan: next }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function impersonate() {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id }),
    });
    if (res.ok) window.location.href = "/dashboard";
  }

  async function deleteCompany() {
    const comment = prompt(`Изтриване на фирма „${props.name}".\nПосочете коментар/причина (по избор) — действието е необратимо:`);
    if (comment === null) return;
    if (!confirm(`Сигурни ли сте? Всички данни на „${props.name}" ще бъдат изтрити завинаги.`)) return;
    const res = await fetch(`/api/admin/company/${props.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }),
    });
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Грешка при изтриване.");
  }

  const d = props.details;
  const info: [string, string | null][] = [
    ["ДДС №", d.vatNumber], ["Сектор", d.sector], ["Град", d.city],
    ["Адрес", d.address], ["МОЛ", d.mol], ["Телефон", d.phone], ["Имейл (фирма)", d.email],
  ];
  const act = activityBadge(props.lastActivity);
  const awaitingPayment = plan !== "free" && pay !== "received";

  return (
    <>
      <tr>
        <td>
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▼" : "▶"}</span>
            <span>
              <span style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {props.name}
                {awaitingPayment && <span title="Фирмата има платен план, но плащането не е потвърдено — прегледайте и потвърдете." style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--brass)", borderRadius: 10, padding: "1px 8px" }}>Очаква потвърждение</span>}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{props.owners}</span>
            </span>
          </button>
        </td>
        <td>
          <span title={props.lastActivity ? `Последна активност: ${new Date(props.lastActivity).toLocaleString("bg-BG")}` : "Няма регистрирана активност"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: act.color, background: act.bg, borderRadius: 12, padding: "2px 9px", whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: act.color, display: "inline-block" }} />{act.label}
          </span>
        </td>
        <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{props.eik ?? "—"}</td>
        <td className="num">{props.users}</td>
        <td className="num">{props.docs}</td>
        <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{props.createdAt}</td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <select value={plan} onChange={(e) => changePlan(e.target.value)} disabled={saving} style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {saved && <span style={{ color: "var(--emerald)", fontSize: 12 }}>✓</span>}
            {plan !== "free" && (
              <select value={pay} onChange={(e) => changePayment(e.target.value)}
                title="Статус на плащане — само Получено плащане се брои като продажба"
                style={{ width: "auto", padding: "5px 8px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  color: "#fff", border: "none", background: PAY_META[pay]?.color ?? "var(--muted)" }}>
                {PAY_OPTS.map((p) => <option key={p.id} value={p.id} style={{ color: "#16201C" }}>{p.label}</option>)}
              </select>
            )}
          </div>
        </td>
        <td>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={impersonate} className="btn btn-ghost btn-sm">Влез в акаунта →</button>
            <button onClick={deleteCompany} className="btn btn-ghost btn-sm" title="Изтрий фирмата" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/></svg></button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ background: "rgba(0,0,0,.02)", padding: "16px 20px" }}>
            {/* Управление на абонамент */}
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,.6)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>УПРАВЛЕНИЕ НА АБОНАМЕНТ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div><label style={{ fontSize: 11 }}>План</label><select value={mPlan} onChange={(e) => setMPlan(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11 }}>Статус</label><select value={mStatus} onChange={(e) => setMStatus(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}>{([["active", "Активен"], ["trialing", "Пробен период"], ["past_due", "Просрочен"], ["cancelled", "Отказан"]] as [string, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label style={{ fontSize: 11 }}>Плащане</label><select value={pay} onChange={(e) => setPay(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}>{PAY_OPTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
                <div><label style={{ fontSize: 11 }}>В сила от</label><input type="date" value={mStart} onChange={(e) => setMStart(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
                <div><label style={{ fontSize: 11 }}>В сила до</label><input type="date" value={mEnd} onChange={(e) => setMEnd(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
                <button className="btn btn-primary btn-sm" onClick={saveSubscription}>Запази абонамент</button>
                {subMsg && <span style={{ fontSize: 12, color: subMsg.startsWith("✓") ? "var(--emerald)" : "var(--brick)" }}>{subMsg}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                Безплатен пробен период използван: <strong>{props.sub.trialUsed ? "Да" : "Не"}</strong>
                {props.sub.periodEnd && <> · Текущ период до: <strong>{new Date(props.sub.periodEnd).toLocaleDateString("bg-BG")}</strong></>}
                <span style={{ marginLeft: 8 }}>· След изтичане профилът автоматично се връща към Безплатен.</span>
              </div>

              {/* История на абонамента */}
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 6 }}>ИСТОРИЯ НА АБОНАМЕНТА</div>
                {props.events.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Няма записани събития.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {props.events.map((e, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                        <span style={{ color: "var(--muted)", whiteSpace: "nowrap", minWidth: 120 }}>{new Date(e.createdAt).toLocaleString("bg-BG")}</span>
                        <span style={{ fontWeight: 700, color: EVENT_COLOR[e.type] ?? "var(--ink)", minWidth: 130 }}>{EVENT_LABEL[e.type] ?? e.type}</span>
                        <span style={{ color: "var(--ink-soft)" }}>
                          {e.plan ? `план: ${e.plan}` : ""}{e.amount != null ? ` · ${e.amount} €` : ""}{e.period ? ` · ${e.period}` : ""}{e.note ? ` · ${e.note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>ДАННИ НА ФИРМАТА</div>
                <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 12px", fontSize: 12.5 }}>
                  {info.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt style={{ color: "var(--muted)" }}>{k}</dt>
                      <dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
                    </div>
                  ))}
                  {info.every(([, v]) => !v) && <span style={{ color: "var(--muted)" }}>Няма допълнителни данни.</span>}
                </dl>
              </div>
              <div>
                <button onClick={() => setShowUsers((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1 }}>
                  <span>{showUsers ? "▼" : "▶"}</span> ПОТРЕБИТЕЛИ НА ФИРМАТА ({props.members.length})
                </button>
                {showUsers && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {props.members.map((m, i) => (
                      <div key={i} style={{ fontSize: 12.5, borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
                        <div style={{ fontWeight: 600 }}>{m.name ?? "—"} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({m.email})</span> <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: m.role === "owner" ? "var(--brass)" : m.role === "employee" ? "var(--emerald-dark)" : "var(--navy)", borderRadius: 10, padding: "1px 8px" }}>{ROLE_BG[m.role] ?? m.role}</span></div>
                        <div style={{ color: "var(--ink-soft)" }}>Качество: {m.representativeRole ?? "—"}</div>
                        <div style={{ color: "var(--ink-soft)" }}>
                          Маркетинг съгласие: {m.marketingConsent ? "✓ Да" : "Не"} ·
                          Условия приети: {m.termsAcceptedAt ? new Date(m.termsAcceptedAt).toLocaleDateString("bg-BG") : "—"}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Регистриран: {new Date(m.createdAt).toLocaleString("bg-BG")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
