"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatCurrency, PAYMENT_METHODS } from "@/lib/constants";
import { paymentDisplayStatus, summarizePayments } from "@/lib/payments";

export type PaymentRow = {
  id: string; direction: string; status: string; amount: number; currency: string;
  date: string; dueDate: string | null; method: string; reason: string | null;
  counterpartyName: string | null; documentRef: string | null; bankAccount: string | null; note: string | null;
};
export type RefOption = { id: string; name: string };

const STATUS_COLOR: Record<string, string> = { received: "var(--emerald-dark)", made: "var(--brick)", pending: "var(--brass)", overdue: "var(--brick)" };

export function PaymentsJournal({ initial, clients, suppliers }: { initial: PaymentRow[]; clients: RefOption[]; suppliers: RefOption[] }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<PaymentRow[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Клиентски филтри (не изискват презареждане).
  const [fDir, setFDir] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fMethod, setFMethod] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [q, setQ] = useState("");

  const now = new Date();
  const filtered = useMemo(() => rows.filter((p) => {
    if (fDir && p.direction !== fDir) return false;
    const ds = paymentDisplayStatus(p, now);
    if (fStatus && ds !== fStatus) return false;
    if (fMethod && p.method !== fMethod) return false;
    if (fFrom && p.date.slice(0, 10) < fFrom) return false;
    if (fTo && p.date.slice(0, 10) > fTo) return false;
    if (q.trim()) {
      const hay = `${p.counterpartyName ?? ""} ${p.documentRef ?? ""} ${p.reason ?? ""} ${p.note ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rows, fDir, fStatus, fMethod, fFrom, fTo, q]);

  const sum = useMemo(() => summarizePayments(filtered, now), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = { direction: "in", status: "completed", amount: "", currency: "EUR", date: new Date().toISOString().slice(0, 10), dueDate: "", method: "bank_transfer", reason: "", clientId: "", supplierId: "", bankAccount: "", note: "" };
  const [form, setForm] = useState({ ...empty });
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function add() {
    setErr("");
    if (!(Number(form.amount) > 0)) { setErr(t("payments.errAmount")); return; }
    setBusy(true);
    const res = await fetch("/api/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: form.direction, status: form.status, amount: Number(form.amount), currency: form.currency,
        date: form.date, dueDate: form.dueDate || null, method: form.method, reason: form.reason || null,
        clientId: form.direction === "in" ? (form.clientId || null) : null,
        supplierId: form.direction === "out" ? (form.supplierId || null) : null,
        bankAccount: form.bankAccount || null, note: form.note || null,
      }),
    });
    setBusy(false);
    if (res.ok) { const p = await res.json(); setRows((prev) => [normalize(p), ...prev]); setForm({ ...empty }); setShowForm(false); }
    else setErr((await res.json().catch(() => ({}))).error ?? t("payments.errSave"));
  }
  function normalize(p: Record<string, unknown>): PaymentRow {
    return {
      id: String(p.id), direction: String(p.direction), status: String(p.status), amount: Number(p.amount), currency: String(p.currency),
      date: new Date(String(p.date)).toISOString(), dueDate: p.dueDate ? new Date(String(p.dueDate)).toISOString() : null,
      method: String(p.method), reason: (p.reason as string) ?? null, counterpartyName: (p.counterpartyName as string) ?? null,
      documentRef: (p.documentRef as string) ?? null, bankAccount: (p.bankAccount as string) ?? null, note: (p.note as string) ?? null,
    };
  }
  async function del(id: string) {
    if (!confirm(t("payments.confirmDelete"))) return;
    const res = await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev.filter((p) => p.id !== id));
  }

  const methodLabel = (id: string) => t(`enums.payment.${id}`);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("payments.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("payments.subtitle")}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? t("payments.cancel") : t("payments.add")}</button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: t("payments.kpi.received"), value: formatCurrency(sum.received), color: "var(--emerald-dark)" },
          { label: t("payments.kpi.made"), value: formatCurrency(sum.made), color: "var(--brick)" },
          { label: t("payments.kpi.net"), value: formatCurrency(sum.net), color: sum.net >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
          { label: t("payments.kpi.pending"), value: formatCurrency(sum.pendingIn + sum.pendingOut), color: "var(--brass)" },
          { label: t("payments.kpi.overdue"), value: formatCurrency(sum.overdue), color: "var(--brick)" },
        ].map((k) => (
          <div key={k.label} className="glass kpi-card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {/* Форма за добавяне */}
      {showForm && (
        <div className="glass panel" style={{ padding: "16px 18px", marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, alignItems: "end" }}>
          <div><label>{t("payments.f.direction")}</label>
            <select value={form.direction} onChange={(e) => set("direction", e.target.value)}>
              <option value="in">{t("payments.dir.in")}</option><option value="out">{t("payments.dir.out")}</option>
            </select>
          </div>
          <div><label>{t("payments.f.status")}</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="completed">{t("payments.st.completed")}</option><option value="pending">{t("payments.st.pending")}</option>
            </select>
          </div>
          <div><label>{t("payments.f.amount")}</label><input value={form.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" /></div>
          <div><label>{t("payments.f.date")}</label><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          {form.status === "pending" && <div><label>{t("payments.f.dueDate")}</label><input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>}
          <div><label>{t("payments.f.method")}</label>
            <select value={form.method} onChange={(e) => set("method", e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{methodLabel(m.id)}</option>)}
            </select>
          </div>
          {form.direction === "in"
            ? <div><label>{t("payments.f.client")}</label><select value={form.clientId} onChange={(e) => set("clientId", e.target.value)}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            : <div><label>{t("payments.f.supplier")}</label><select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          <div><label>{t("payments.f.reason")}</label><input value={form.reason} onChange={(e) => set("reason", e.target.value)} /></div>
          <div><label>{t("payments.f.bankAccount")}</label><input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="IBAN / каса" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>{t("payments.f.note")}</label><input value={form.note} onChange={(e) => set("note", e.target.value)} /></div>
          <button className="btn btn-primary btn-sm" onClick={add} disabled={busy}>{busy ? "…" : t("payments.save")}</button>
        </div>
      )}

      {/* Филтри */}
      <div className="glass panel" style={{ padding: "10px 14px", marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label style={{ fontSize: 11 }}>{t("payments.f.direction")}</label><select value={fDir} onChange={(e) => setFDir(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}><option value="">{t("payments.filter.all")}</option><option value="in">{t("payments.dir.in")}</option><option value="out">{t("payments.dir.out")}</option></select></div>
        <div><label style={{ fontSize: 11 }}>{t("payments.f.status")}</label><select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}><option value="">{t("payments.filter.all")}</option>{["received", "made", "pending", "overdue"].map((s) => <option key={s} value={s}>{t(`payments.disp.${s}`)}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>{t("payments.f.method")}</label><select value={fMethod} onChange={(e) => setFMethod(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }}><option value="">{t("payments.filter.all")}</option>{PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{methodLabel(m.id)}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>{t("payments.filter.from")}</label><input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>{t("payments.filter.to")}</label><input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={{ padding: "5px 8px", fontSize: 12.5 }} /></div>
        <div style={{ flex: 1, minWidth: 140 }}><label style={{ fontSize: 11 }}>{t("payments.filter.search")}</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("payments.filter.searchPh")} style={{ padding: "5px 8px", fontSize: 12.5, width: "100%" }} /></div>
      </div>

      {/* Таблица */}
      {filtered.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "36px 0", color: "var(--muted)", fontSize: 13 }}>{t("payments.empty")}</div>
      ) : (
        <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
          <table>
            <thead><tr>
              <th>{t("payments.th.date")}</th><th>{t("payments.th.direction")}</th><th className="num">{t("payments.th.amount")}</th>
              <th>{t("payments.th.counterparty")}</th><th>{t("payments.th.document")}</th><th>{t("payments.th.method")}</th>
              <th>{t("payments.th.reason")}</th><th>{t("payments.th.status")}</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((p) => {
                const ds = paymentDisplayStatus(p, now);
                return (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12.5 }}>{new Date(p.date).toLocaleDateString(locale)}</td>
                    <td style={{ fontSize: 12.5, color: p.direction === "in" ? "var(--emerald-dark)" : "var(--brick)" }}>{t(`payments.dir.${p.direction}`)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatCurrency(p.amount, p.currency)}</td>
                    <td>{p.counterpartyName ?? "—"}</td>
                    <td style={{ fontSize: 12.5 }}>{p.documentRef ?? "—"}</td>
                    <td style={{ fontSize: 12.5 }}>{methodLabel(p.method)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{p.reason ?? "—"}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[ds] }}>{t(`payments.disp.${ds}`)}</span></td>
                    <td style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => del(p.id)}>{t("payments.delete")}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
