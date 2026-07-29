"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, ACCOUNTANT_PLANS } from "@/lib/constants";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

// Административните детайли (разгъваем панел) за счетоводна къща. Super-Admin-only
// вътрешен инструмент — следва същия модел като AdminCompanyRow (на български).
type FirmClient = { id: string; name: string; plan: string; billingMode: string; paymentStatus: string };
type FirmEvent = { type: string; plan: string | null; status: string | null; period: string | null; amount: number | null; note: string | null; createdAt: string };

export type AdminFirmRow = {
  id: string; name: string; planLabel: string; firmPlan: string; paymentStatus: string; maxClients: string;
  maxClientsNum: number | null;
  totalClients: number; startClients: number; paidClients: number;
  ratePercent: number; overridePercent: number | null; monthlyCommission: number;
  paidTotal: number; pendingRequests: number;
  eik: string | null; email: string | null; phone: string | null;
  createdAt: string; lastActivity: string | null;
  ownerName: string | null; ownerEmail: string | null; usersCount: number;
  archived: boolean;
  billingMode: string; cdtEndsAt: string | null; cdtNote: string | null; cdtActivatedAt: string | null;
  clientsSummary: { total: number; active: number; start: number; paid: number; cdt: number; freeSlots: number | null };
  recentClients: FirmClient[];
  events: FirmEvent[];
};
export type AdminPayoutRow = { id: string; firmId: string; firmName: string; amount: number; requestedAt: string };
export type FirmTarget = { id: string; name: string };

const EVENT_LABEL: Record<string, string> = {
  request: "Заявка за плащане", payment: "Получено плащане", plan_change: "Смяна на план",
  status_change: "Промяна на статус", trial: "Пробен период", expiry: "Изтекъл → Безплатен",
};
const BILLING_LABEL: Record<string, string> = { standard: "Стандартно таксуване", cdt_client: "Клиент на CDT (безплатно)", internal: "Вътрешен режим" };
const PAY_LABEL: Record<string, string> = { received: "Получено плащане", pending: "Изчаква се плащане", not_received: "Не е получено плащане" };

export function AdminFirmsPanel({ firms, payouts, targets = [] }: { firms: AdminFirmRow[]; payouts: AdminPayoutRow[]; targets?: FirmTarget[] }) {
  const t = useT();
  const { locale, messages } = useI18n();
  const firmPlanName = (id: string) => (messages as unknown as { pricing: { firmPlans: Record<string, { name: string }> } }).pricing.firmPlans[id]?.name ?? id;
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [pct, setPct] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

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
  const cdtFirms = firms.filter((f) => f.billingMode === "cdt_client").length;

  const kpis = [
    { label: t("admintools.firms.kpiFirms"), value: String(firms.length), color: "var(--navy)" },
    { label: t("admintools.firms.kpiClients"), value: String(agg.clients), color: "var(--ink)" },
    { label: t("admintools.firms.kpiStart"), value: String(agg.start), color: "var(--brass)" },
    { label: t("admintools.firms.kpiPaid"), value: String(agg.paid), color: "var(--emerald-dark)" },
    { label: t("admintools.firms.kpiCdt"), value: String(cdtFirms), color: "var(--navy)" },
    { label: t("admintools.firms.kpiConversion"), value: `${conversion}%`, color: "var(--navy)" },
    { label: t("admintools.firms.kpiCommMonth"), value: formatCurrency(agg.monthly), color: "var(--brick)" },
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
            {firms.map((f) => {
              const isCdt = f.billingMode === "cdt_client";
              const isInternal = f.billingMode === "internal";
              const noCharge = isCdt || isInternal;
              const awaiting = !noCharge && f.paymentStatus !== "received";
              return (
              <FirmRows key={f.id} f={f} open={openId === f.id} onToggle={() => setOpenId(openId === f.id ? null : f.id)}
                isCdt={isCdt} isInternal={isInternal} noCharge={noCharge} awaiting={awaiting}
                editId={editId} setEditId={setEditId} pct={pct} setPct={setPct} busy={busy}
                savePercent={savePercent} setPlan={setPlan} setPayment={setPayment} viewClients={viewClients}
                firmPlanName={firmPlanName} locale={locale} t={t} router={router} targets={targets.filter((tg) => tg.id !== f.id)} />
              );
            })}
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

// ─────────────────────────────────────────────────────────────────────────
// Ред за счетоводна къща (компактен) + разгъваем панел с всички Super Admin действия.
// ─────────────────────────────────────────────────────────────────────────
type RowProps = {
  f: AdminFirmRow; open: boolean; onToggle: () => void;
  isCdt: boolean; isInternal: boolean; noCharge: boolean; awaiting: boolean;
  editId: string | null; setEditId: (v: string | null) => void; pct: string; setPct: (v: string) => void; busy: boolean;
  savePercent: (id: string) => void; setPlan: (id: string, p: string) => void; setPayment: (id: string, p: string) => void; viewClients: (id: string) => void;
  firmPlanName: (id: string) => string; locale: string; t: ReturnType<typeof useT>; router: ReturnType<typeof useRouter>; targets: FirmTarget[];
};

function FirmRows(p: RowProps) {
  const { f, open, onToggle, isCdt, isInternal, noCharge, awaiting, t, router } = p;
  return (
    <>
      <tr>
        <td>
          <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▼" : "▶"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {f.name}
              <span title="Счетоводна къща" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--brass)", borderRadius: 10, padding: "1px 8px" }}>Счетоводна къща</span>
              {isCdt && <span title="Безплатен достъп като клиент на CDT" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--navy)", borderRadius: 10, padding: "1px 8px" }}>CDT клиент</span>}
              {isInternal && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--ink-soft)", borderRadius: 10, padding: "1px 8px" }}>Вътрешен</span>}
              {awaiting && <span title="Изисква плащане" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--brick)", borderRadius: 10, padding: "1px 8px" }}>Изисква плащане</span>}
            </span>
          </button>
        </td>
        <td>
          <select value={f.firmPlan} onChange={(e) => p.setPlan(f.id, e.target.value)} style={{ fontSize: 12, padding: "3px 6px" }}>
            {ACCOUNTANT_PLANS.map((pl) => <option key={pl.id} value={pl.id}>{p.firmPlanName(pl.id)}</option>)}
          </select>
        </td>
        <td>
          {noCharge
            ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>{isCdt ? "Без такса · CDT" : "Вътрешен режим"}</span>
            : f.paymentStatus === "received"
              ? <button onClick={() => p.setPayment(f.id, "pending")} title={t("admintools.firms.cancelConfirmTitle")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--emerald-dark)" }}>{t("admintools.firms.paidBtn")}</button>
              : <button onClick={() => p.setPayment(f.id, "received")} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>{t("admintools.firms.confirmPayment")}</button>}
        </td>
        <td className="num">{f.totalClients} / {f.maxClients}</td>
        <td className="num" style={{ fontWeight: 700, color: "var(--emerald-dark)" }}>{f.paidClients}</td>
        <td className="num">{formatCurrency(f.monthlyCommission)}</td>
        <td>
          {p.editId === f.id ? (
            <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <input value={p.pct} onChange={(e) => p.setPct(e.target.value)} placeholder={String(f.ratePercent)} style={{ width: 52, padding: "3px 6px", fontSize: 12 }} />
              <button className="btn btn-primary btn-sm" onClick={() => p.savePercent(f.id)} disabled={p.busy}>OK</button>
            </span>
          ) : (
            <button onClick={() => { p.setEditId(f.id); p.setPct(f.overridePercent != null ? String(f.overridePercent) : ""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--navy)", fontWeight: 700 }}>
              {f.ratePercent}%{f.overridePercent != null ? " *" : ""} ✎
            </button>
          )}
        </td>
        <td className="num">{formatCurrency(f.paidTotal)}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => p.viewClients(f.id)}>{t("admintools.firms.clients")}</button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} style={{ background: "rgba(0,0,0,.02)", padding: "16px 20px" }}>
            <FirmDetail f={f} isCdt={isCdt} isInternal={isInternal} noCharge={noCharge} locale={p.locale} router={router} viewClients={p.viewClients} targets={p.targets} />
          </td>
        </tr>
      )}
    </>
  );
}

function FirmDetail({ f, isCdt, isInternal, noCharge, locale, router, viewClients, targets }: {
  f: AdminFirmRow; isCdt: boolean; isInternal: boolean; noCharge: boolean; locale: string;
  router: ReturnType<typeof useRouter>; viewClients: (id: string) => void; targets: FirmTarget[];
}) {
  const [mode, setMode] = useState(f.billingMode);
  const [cdtEnd, setCdtEnd] = useState(f.cdtEndsAt?.slice(0, 10) ?? "");
  const [note, setNote] = useState(f.cdtNote ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: f.name, eik: f.eik ?? "", email: f.email ?? "", phone: f.phone ?? "" });

  async function patch(body: Record<string, unknown>, ok = "✓ Запазено") {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/admin/firm/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) { setMsg(ok); router.refresh(); setTimeout(() => setMsg(""), 2500); }
    else setMsg((await res.json()).error ?? "Грешка");
  }
  async function saveBilling() {
    await patch({ billingMode: mode, cdtEndsAt: cdtEnd || null, cdtNote: note || null });
  }
  async function saveEdit() {
    await patch({ details: form }); setEditing(false);
  }
  async function trash() {
    const managed = f.clientsSummary.total;
    if (managed > 0) {
      const choice = prompt(`Тази счетоводна къща управлява ${managed} клиентски фирми.\n\nНапишете:\n- „detach" за да откачите клиентите и преместите къщата в Кошчето;\n- „only" за да преместите само къщата (клиентите остават свързани);\n- празно/Отказ за отказ.`);
      if (!choice) return;
      if (choice === "detach") {
        // Откачването на ВСИЧКИ управлявани клиенти става на сървъра (не само извадката).
        await fetch(`/api/admin/company/${f.id}?detachClients=1`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: "Кошче + откачени клиенти" }) });
        router.refresh(); return;
      }
      if (choice !== "only") return;
    } else if (!confirm(`Преместване на „${f.name}" в Кошчето?`)) return;
    await fetch(`/api/admin/company/${f.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: "Кошче от Супер Админ" }) });
    router.refresh();
  }
  async function detachClient(clientId: string) {
    if (!confirm("Откачване на клиента от тази счетоводна къща? Данните на клиента се запазват.")) return;
    const res = await fetch(`/api/admin/firm/${f.id}/client`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, action: "detach" }) });
    if (res.ok) router.refresh(); else alert((await res.json()).error ?? "Грешка");
  }
  async function transferClient(clientId: string) {
    if (targets.length === 0) { alert("Няма друга счетоводна къща за прехвърляне."); return; }
    const list = targets.map((tg, i) => `${i + 1}. ${tg.name}`).join("\n");
    const pick = prompt(`Прехвърляне на клиента към коя къща? Въведете номер:\n${list}`);
    const idx = pick ? Number(pick) - 1 : -1;
    if (idx < 0 || idx >= targets.length) return;
    const res = await fetch(`/api/admin/firm/${f.id}/client`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, action: "transfer", targetFirmId: targets[idx].id }) });
    if (res.ok) router.refresh(); else alert((await res.json()).error ?? "Грешка");
  }

  const info: [string, string | null][] = [
    ["ЕИК", f.eik], ["Email", f.email], ["Телефон", f.phone],
    ["Регистрация", new Date(f.createdAt).toLocaleDateString(locale)],
    ["Последна активност", f.lastActivity ? new Date(f.lastActivity).toLocaleDateString(locale) : "—"],
    ["Основен потребител", f.ownerName || f.ownerEmail || "—"],
    ["Потребители", String(f.usersCount)],
    ["Счетоводен план", f.planLabel],
    ["Billing mode", BILLING_LABEL[f.billingMode] ?? f.billingMode],
    ["Плащане", noCharge ? "—" : (PAY_LABEL[f.paymentStatus] ?? f.paymentStatus)],
    ["Клиенти / лимит", `${f.clientsSummary.total} / ${f.maxClients}`],
    ["Партньорски процент", `${f.ratePercent}%${f.overridePercent != null ? " (ръчно)" : ""}`],
    ["Очаквана комисионна", formatCurrency(f.monthlyCommission)],
    ["Изплатена комисионна", formatCurrency(f.paidTotal)],
    ["Чакаща комисионна", formatCurrency(f.pendingRequests)],
    ["CDT достъп до", isCdt ? (f.cdtEndsAt ? new Date(f.cdtEndsAt).toLocaleDateString(locale) : "безсрочно") : "—"],
    ["Административна бележка", f.cdtNote || "—"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Действия */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => viewClients(f.id)}>Влез в акаунта →</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? "Затвори редакция" : "Редактирай данни"}</button>
        <button className="btn btn-ghost btn-sm" onClick={trash} style={{ color: "var(--brick)", borderColor: "var(--brick)" }}>Премести в Кошчето</button>
      </div>

      {/* Редакция на фирмени данни */}
      {editing && (
        <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.6)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><label style={{ fontSize: 11 }}>Име</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
          <div><label style={{ fontSize: 11 }}>ЕИК</label><input value={form.eik} onChange={(e) => setForm({ ...form, eik: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
          <div><label style={{ fontSize: 11 }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
          <div><label style={{ fontSize: 11 }}>Телефон</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
          <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Запази</button>
        </div>
      )}

      {/* Billing mode / Клиент на CDT */}
      <div style={{ padding: "12px 14px", background: isCdt ? "rgba(26,54,93,.06)" : "rgba(255,255,255,.6)", borderRadius: 8, border: `1px solid ${isCdt ? "var(--navy)" : "var(--border)"}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", letterSpacing: 1, marginBottom: 8 }}>BILLING MODE / КЛИЕНТ НА CDT</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>
          Пълен счетоводен план БЕЗ такса при CDT/вътрешен режим. Не се издава проформа, не влиза в MRR/ARR, не се брои като платена къща. Планът се управлява отделно (dropdown в реда).
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><label style={{ fontSize: 11 }}>Режим</label><select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}>
            <option value="standard">Стандартно таксуване</option>
            <option value="cdt_client">Клиент на CDT (безплатно)</option>
            <option value="internal">Вътрешен режим</option>
          </select></div>
          {mode === "cdt_client" && <>
            <div><label style={{ fontSize: 11 }}>Достъп до (по избор)</label><input type="date" value={cdtEnd} onChange={(e) => setCdtEnd(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
            <div style={{ flex: "1 1 220px" }}><label style={{ fontSize: 11 }}>Бележка</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="напр. клиент по договор №…" style={{ padding: "5px 8px", fontSize: 12.5, width: "100%" }} /></div>
          </>}
          <button className="btn btn-primary btn-sm" onClick={saveBilling} disabled={busy}>Запази режим</button>
          {msg && <span style={{ fontSize: 12, color: msg.startsWith("✓") ? "var(--emerald)" : "var(--brick)" }}>{msg}</span>}
        </div>
      </div>

      {/* Данни + клиенти */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>ДАННИ НА КЪЩАТА</div>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 12px", fontSize: 12.5 }}>
            {info.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>КЛИЕНТСКИ ФИРМИ</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>Общо: <strong>{f.clientsSummary.total}</strong></span>
            <span>Активни: <strong>{f.clientsSummary.active}</strong></span>
            <span>START: <strong>{f.clientsSummary.start}</strong></span>
            <span>Платени: <strong>{f.clientsSummary.paid}</strong></span>
            <span>CDT: <strong>{f.clientsSummary.cdt}</strong></span>
            <span>Свободни места: <strong>{f.clientsSummary.freeSlots ?? "∞"}</strong></span>
          </div>
          {f.recentClients.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Няма клиентски фирми.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {f.recentClients.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, borderLeft: "2px solid var(--border)", paddingLeft: 8 }}>
                  <span style={{ fontWeight: 600, flex: 1 }}>{c.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>{c.billingMode !== "standard" ? "CDT" : c.plan}</span>
                  <button onClick={() => viewClients(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: 10.5, padding: "2px 6px" }}>Влез</button>
                  <button onClick={() => detachClient(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: 10.5, padding: "2px 6px" }}>Откачи</button>
                  <button onClick={() => transferClient(c.id)} className="btn btn-ghost btn-sm" style={{ fontSize: 10.5, padding: "2px 6px" }}>Прехвърли</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit / история */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 6 }}>ИСТОРИЯ НА АБОНАМЕНТА</div>
        {f.events.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Няма записани събития.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {f.events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                <span style={{ color: "var(--muted)", whiteSpace: "nowrap", minWidth: 120 }}>{new Date(e.createdAt).toLocaleString(locale)}</span>
                <span style={{ fontWeight: 700, color: "var(--navy)", minWidth: 130 }}>{EVENT_LABEL[e.type] ?? e.type}</span>
                <span style={{ color: "var(--ink-soft)" }}>{e.plan ? `план: ${e.plan}` : ""}{e.note ? ` · ${e.note}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
