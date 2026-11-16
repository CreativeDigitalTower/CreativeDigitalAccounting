"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type RecState = "ok" | "historically_paid" | "historically_partial";
type Balance = { totalInvoiced: number; totalReceived: number; settled: number; outstanding: number; credit: number; net: number; confirmedOutstanding: number; unconfirmedOutstanding: number; unreconciledCount: number };
type Inv = { id: string; number: string; issueDate: string | null; dueDate: string | null; status: string; currency: string; total: number; paid: number; remaining: number; recState: RecState; needsReconciliation: boolean };
type Alloc = { amount: number; invoiceId: string; invoiceNumber: string };
type Payment = { id: string; date: string | null; amount: number; currency: string; method: string; reference: string | null; note: string | null; status: string; source: string; createdAt: string | null; voidedAt: string | null; voidReason: string | null; allocated: number; allocations: Alloc[] };
type PreviewAlloc = { invoiceId: string; amount: number; invoiceNumber: string | null };

const METHODS = ["bank_transfer", "cash", "other"] as const;

export function ClientPaymentsPanel({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const { num } = useI18n();
  const [bal, setBal] = useState<{ balance: Balance; invoices: Inv[] } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid" | "partially_paid" | "paid">("all");
  const [open, setOpen] = useState(false);
  const [reconcileInv, setReconcileInv] = useState<Inv | null>(null);

  const load = useCallback(async () => {
    const [rb, rp] = await Promise.all([
      fetch(`/api/logistics/clients/${id}/balance`),
      fetch(`/api/logistics/client-payments?clientId=${id}`),
    ]);
    if (rb.ok) setBal(await rb.json());
    if (rp.ok) setPayments(await rp.json());
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const statusLabel = (s: string) => s === "paid" ? t("logistics.pay.stPaid") : s === "partially_paid" ? t("logistics.pay.stPartial") : t("logistics.pay.stUnpaid");
  const methodLabel = (m: string) => t(`logistics.pay.method_${m}`) || m;
  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const filtered = useMemo(() => {
    if (!bal) return [];
    if (filter === "all") return bal.invoices;
    if (filter === "paid") return bal.invoices.filter((i) => i.status === "paid");
    if (filter === "partially_paid") return bal.invoices.filter((i) => i.status === "partially_paid");
    return bal.invoices.filter((i) => i.remaining > 0.004 && i.status !== "paid");
  }, [bal, filter]);

  async function voidPayment(p: Payment) {
    const reason = window.prompt(t("logistics.pay.voidPrompt"));
    if (!reason) return;
    const r = await fetch(`/api/logistics/client-payments/${p.id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (r.ok) load();
  }

  if (!bal) return null;
  const b = bal.balance;
  const cur = bal.invoices[0]?.currency || "MKD";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5, whiteSpace: "nowrap" as const };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("logistics.pay.sectionTitle")}</h3>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}>{t("logistics.pay.register")}</button>}
      </div>

      {/* Финансово обобщение (§4/§13) */}
      <div className="glass panel" style={{ marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <Sum label={t("logistics.pay.totalInvoiced")} value={`${num(b.totalInvoiced)} ${cur}`} />
          <Sum label={t("logistics.pay.totalReceived")} value={`${num(b.totalReceived)} ${cur}`} />
          <Sum label={t("logistics.pay.outstanding")} value={`${num(b.outstanding)} ${cur}`} warn={b.outstanding > 0} />
          <Sum label={t("logistics.pay.credit")} value={`${num(b.credit)} ${cur}`} good={b.credit > 0} />
          <Sum label={t("logistics.pay.net")} value={`${num(b.net)} ${cur}`} warn={b.net > 0} good={b.net < 0} />
        </div>
        {b.unreconciledCount > 0 && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "rgba(176,58,46,.08)", border: "1px solid rgba(176,58,46,.25)", fontSize: 11.5, color: "var(--brick)" }}>
            ⚠️ {t("logistics.pay.unreconciledWarn")}
            {b.unconfirmedOutstanding > 0 && <span> {t("logistics.pay.confirmedOutstanding")}: <strong className="num">{num(b.confirmedOutstanding)} {cur}</strong>.</span>}
          </div>
        )}
      </div>

      {/* Фактури */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {(["all", "unpaid", "partially_paid", "paid"] as const).map((f) => (
          <button key={f} className="btn btn-sm" style={{ fontSize: 11.5, background: filter === f ? "var(--brick)" : "transparent", color: filter === f ? "#fff" : "inherit" }} onClick={() => setFilter(f)}>{t(`logistics.pay.f_${f}`)}</button>
        ))}
      </div>
      <div className="glass panel" style={{ overflowX: "auto", marginBottom: 12 }}>
        {filtered.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.pay.noInvoices")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.pay.invoice")}</th><th style={th}>{t("logistics.pay.issueDate")}</th><th style={th}>{t("logistics.pay.dueDate")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.pay.total")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.pay.paid")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.pay.remaining")}</th><th style={th}>{t("logistics.pay.status")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td style={td}><Link href={`/dashboard/documents/${i.id}`} style={{ fontWeight: 600 }}>{i.number}</Link></td>
                  <td style={td}>{dt(i.issueDate)}</td><td style={td}>{dt(i.dueDate)}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{num(i.total)} {i.currency}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{i.needsReconciliation ? "—" : num(i.paid)}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{i.needsReconciliation ? "—" : `${num(i.remaining)} ${i.currency}`}</td>
                  <td style={td}>{statusLabel(i.status)}{i.needsReconciliation && <span title={t(`logistics.pay.recHint_${i.recState}`)} style={{ marginLeft: 6, fontSize: 10.5, color: "var(--brick)", whiteSpace: "nowrap" }}>⚠️ {t("logistics.pay.toReconcile")}</span>}</td>
                  {canManage && <td style={{ ...td, textAlign: "right" }}>{i.needsReconciliation && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setReconcileInv(i)}>{t("logistics.pay.reconcile")}</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* История на плащанията (§8) */}
      <div className="glass panel" style={{ overflowX: "auto" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t("logistics.pay.history")}</div>
        {payments.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.pay.noPayments")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.pay.date")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.pay.amount")}</th><th style={th}>{t("logistics.pay.method")}</th>
              <th style={th}>{t("logistics.pay.reference")}</th><th style={th}>{t("logistics.pay.allocatedTo")}</th><th style={th}>{t("logistics.pay.status")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={p.status === "voided" ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
                  <td style={td}>{dt(p.date)}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{num(p.amount)} {p.currency}{p.source === "historical" && <span title={p.createdAt ? `${t("logistics.pay.recordedAt")}: ${dt(p.createdAt)}` : undefined} style={{ marginLeft: 5, fontSize: 9.5, padding: "1px 5px", borderRadius: 4, background: "rgba(120,110,90,.15)", color: "var(--muted)" }}>{t("logistics.pay.historicalTag")}</span>}</td>
                  <td style={td}>{methodLabel(p.method)}</td>
                  <td style={td}>{p.reference ?? "—"}</td>
                  <td style={td}>{p.allocations.length ? p.allocations.map((a) => `${a.invoiceNumber}: ${num(a.amount)}`).join(", ") : <span style={{ color: "var(--muted)" }}>{t("logistics.pay.credit")}: {num(p.amount - p.allocated)}</span>}</td>
                  <td style={td}>{p.status === "voided" ? t("logistics.pay.voided") : t("logistics.pay.active")}</td>
                  {canManage && <td style={td}>{p.status === "active" && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px", color: "var(--brick)" }} onClick={() => voidPayment(p)}>{t("logistics.pay.void")}</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <RegisterModal clientId={id} invoices={bal.invoices.filter((i) => i.remaining > 0.004 && !i.needsReconciliation)} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
      {reconcileInv && <RegisterModal clientId={id} invoices={bal.invoices} historicalInvoice={reconcileInv} onClose={() => setReconcileInv(null)} onDone={() => { setReconcileInv(null); load(); }} />}
    </div>
  );
}

function Sum({ label, value, warn, good }: { label: string; value: string; warn?: boolean; good?: boolean }) {
  return <div><div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: warn ? "var(--brick)" : good ? "var(--emerald-dark,#0F8A6A)" : "inherit" }}>{value}</div><div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div></div>;
}

function RegisterModal({ clientId, invoices, historicalInvoice, onClose, onDone }: { clientId: string; invoices: Inv[]; historicalInvoice?: Inv; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { num } = useI18n();
  const historical = !!historicalInvoice;
  const [f, setF] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "bank_transfer", reference: "", note: "", mode: (historical ? "historical" : "auto") as "auto" | "invoice" | "historical", invoiceId: historicalInvoice?.id ?? "" });
  const [preview, setPreview] = useState<{ allocations: PreviewAlloc[]; credit: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const idemp = useRef(`cp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const cur = (historicalInvoice?.currency) || invoices[0]?.currency || "MKD";

  async function doPreview() {
    setErr("");
    const amt = Number(f.amount);
    if (!(amt > 0)) { setErr(t("logistics.pay.errAmount")); return; }
    const p = new URLSearchParams({ clientId, amount: String(amt), currency: cur, mode: f.mode });
    if ((f.mode === "invoice" || f.mode === "historical") && f.invoiceId) p.set("invoiceId", f.invoiceId);
    const r = await fetch(`/api/logistics/client-payments/preview?${p.toString()}`);
    if (r.ok) setPreview(await r.json()); else setErr(t("logistics.common.err"));
  }
  async function confirm(confirmDuplicate = false) {
    const amt = Number(f.amount);
    if (!(amt > 0)) { setErr(t("logistics.pay.errAmount")); return; }
    if ((f.mode === "invoice" || f.mode === "historical") && !f.invoiceId) { setErr(t("logistics.pay.selectInvoice")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/logistics/client-payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, amount: amt, date: new Date(f.date).toISOString(), method: f.method, reference: f.reference || null, note: f.note || null, currency: cur, mode: f.mode, invoiceId: (f.mode === "invoice" || f.mode === "historical") ? f.invoiceId || null : null, idempotencyKey: idemp.current, confirmDuplicate }),
    });
    setBusy(false);
    if (r.ok) { onDone(); return; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 409 && j.error === "duplicate_historical") {
      if (window.confirm(t("logistics.pay.dupConfirm"))) { confirm(true); return; }
      setErr(t("logistics.pay.dupCancelled")); return;
    }
    setErr(j.error ?? t("logistics.common.err"));
  }

  const inp = { padding: "6px 9px", fontSize: 12.5, width: "100%" } as const;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--paper)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 12px" }}>{historical ? t("logistics.pay.historicalTitle") : t("logistics.pay.register")}</h3>
        {historical && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{t("logistics.pay.historicalHint")} <strong>{historicalInvoice?.number}</strong> · {num(historicalInvoice?.total ?? 0)} {cur}</div>}
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.pay.amount")} ({cur})</label><input type="number" min={0} step="0.01" style={inp} value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setPreview(null); }} /></div>
          <div><label style={{ fontSize: 11, color: "var(--muted)" }}>{historical ? t("logistics.pay.realDate") : t("logistics.pay.date")}</label><input type="date" style={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.pay.method")}</label>
            <select style={inp} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{t(`logistics.pay.method_${m}`)}</option>)}</select></div>
          <div><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.pay.reference")}</label><input style={inp} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 11, color: "var(--muted)" }}>{t("logistics.pay.note")}</label><input style={inp} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        {!historical && (
          <div style={{ display: "flex", gap: 14, margin: "10px 0", fontSize: 12.5, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 5 }}><input type="radio" checked={f.mode === "auto"} onChange={() => { setF({ ...f, mode: "auto" }); setPreview(null); }} />{t("logistics.pay.modeAuto")}</label>
            <label style={{ display: "flex", gap: 5 }}><input type="radio" checked={f.mode === "invoice"} onChange={() => { setF({ ...f, mode: "invoice" }); setPreview(null); }} />{t("logistics.pay.modeInvoice")}</label>
            {f.mode === "invoice" && (
              <select style={{ ...inp, width: "auto", flex: 1 }} value={f.invoiceId} onChange={(e) => { setF({ ...f, invoiceId: e.target.value }); setPreview(null); }}>
                <option value="">{t("logistics.pay.selectInvoice")}</option>
                {invoices.filter((i) => i.remaining > 0.004 && !i.needsReconciliation).map((i) => <option key={i.id} value={i.id}>{i.number} · {num(i.remaining)} {i.currency}</option>)}
              </select>
            )}
          </div>
        )}

        {preview && (
          <div className="glass panel" style={{ marginBottom: 10, fontSize: 12.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("logistics.pay.previewTitle")}</div>
            {preview.allocations.length === 0 ? <div style={{ color: "var(--muted)" }}>{t("logistics.pay.noAllocation")}</div> : preview.allocations.map((a) => <div key={a.invoiceId}>{a.invoiceNumber}: <strong className="num">{num(a.amount)} {cur}</strong></div>)}
            {preview.credit > 0 && <div style={{ marginTop: 4, color: "var(--emerald-dark,#0F8A6A)" }}>{t("logistics.pay.credit")}: <strong className="num">{num(preview.credit)} {cur}</strong></div>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
          {!preview ? <button className="btn btn-ghost btn-sm" onClick={doPreview} disabled={busy}>{t("logistics.pay.preview")}</button>
            : <button className="btn btn-primary btn-sm" onClick={() => confirm()} disabled={busy}>{t("logistics.pay.confirm")}</button>}
        </div>
      </div>
    </div>
  );
}
