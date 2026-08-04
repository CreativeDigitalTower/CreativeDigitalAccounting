"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatCurrency, planPrice } from "@/lib/constants";
import { multiCompanyDiscount, applyDiscount } from "@/lib/discount";
import type { MyCompanyKpi } from "@/lib/myCompanies";

const PLAN_KEYS = ["free", "start", "business", "pro"] as const;

export function MyCompaniesClient({ companies, activeId, paidCount }: { companies: MyCompanyKpi[]; activeId: string; paidCount: number }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const [wizard, setWizard] = useState(sp.get("add") === "1");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function enterCompany(id: string) {
    if (id === activeId) { router.push("/dashboard"); return; }
    setBusyId(id);
    const res = await fetch("/api/company/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: id }) });
    if (res.ok) window.location.href = "/dashboard";
    else { setBusyId(null); }
  }

  const money = (n: number) => formatCurrency(n);
  const statusLabel = (c: MyCompanyKpi) => c.billingMode !== "standard" ? t("myCompanies.status.free") : (c.plan === "free" ? t("myCompanies.status.freePlan") : c.paymentStatus === "received" ? t("myCompanies.status.active") : t("myCompanies.status.awaiting"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("myCompanies.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("myCompanies.subtitle", { n: companies.length })}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setWizard(true)}>{t("myCompanies.add")}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {companies.map((c) => (
          <div key={c.id} className="glass panel" style={{ padding: "16px 18px", borderLeft: c.id === activeId ? "3px solid var(--brass)" : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {c.logoUrl
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt={c.name} style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 6, background: "#fff", padding: 3 }} />
                : <div style={{ width: 38, height: 38, borderRadius: 6, background: "var(--brass-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--brass)" }}>{c.name.slice(0, 1)}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {c.name}
                  {c.id === activeId && <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", background: "var(--brass)", borderRadius: 10, padding: "1px 7px" }}>{t("myCompanies.activeBadge")}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("myCompanies.eik")}: {c.eik ?? "—"}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
              <span>{t("myCompanies.plan")}: <strong>{t(`pricing.plans.${c.plan}.name`)}</strong></span>
              <span>{t("myCompanies.statusLabel")}: <strong>{statusLabel(c)}</strong></span>
              {c.discountPercent ? <span style={{ color: "var(--emerald-dark)" }}>−{c.discountPercent}%</span> : null}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12, marginBottom: 12 }}>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.revenue")}</span><strong className="num" style={{ textAlign: "right" }}>{money(c.monthRevenue)}</strong>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.receivables")}</span><strong className="num" style={{ textAlign: "right" }}>{money(c.receivables)}</strong>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.overdue")}</span><strong className="num" style={{ textAlign: "right", color: c.overdueCount ? "var(--brick)" : "inherit" }}>{c.overdueCount}</strong>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.documents")}</span><strong className="num" style={{ textAlign: "right" }}>{c.documents}</strong>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.clients")}</span><strong className="num" style={{ textAlign: "right" }}>{c.clients}</strong>
              <span style={{ color: "var(--muted)" }}>{t("myCompanies.kpi.lastActivity")}</span><strong className="num" style={{ textAlign: "right" }}>{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString(locale) : "—"}</strong>
            </div>

            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} disabled={busyId === c.id} onClick={() => enterCompany(c.id)}>
              {busyId === c.id ? "…" : t("myCompanies.enter")}
            </button>
          </div>
        ))}
      </div>

      {wizard && <AddCompanyWizard paidCount={paidCount} onClose={() => { setWizard(false); router.replace("/dashboard/companies"); }} onCreated={(id) => enterCompany(id)} />}
    </>
  );
}

// ─────────── Wizard за добавяне на фирма (4 стъпки) ───────────
function AddCompanyWizard({ paidCount, onClose, onCreated }: { paidCount: number; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ eik: "", name: "", vatNumber: "", vatRegistered: false, address: "", city: "", mol: "", email: "", phone: "" });
  const [plan, setPlan] = useState<(typeof PLAN_KEYS)[number]>("free");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ companyId: string; proforma: { token: string; number: string } | null } | null>(null);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF((p) => ({ ...p, [k]: v })); }

  async function lookup() {
    if (!f.eik.trim()) return;
    try {
      const res = await fetch(`/api/companies/lookup?eik=${encodeURIComponent(f.eik.trim())}`);
      const d = await res.json();
      if (d.found && d.company) setF((p) => ({ ...p, name: d.company.name || p.name, vatNumber: d.company.vatNumber || p.vatNumber, vatRegistered: !!d.company.vatNumber || p.vatRegistered, address: d.company.address || p.address, city: d.company.city || p.city, mol: d.company.mol || p.mol }));
    } catch { /* ignore */ }
  }

  // Ценова разбивка с мултифирмена отстъпка (превю).
  const rule = plan !== "free" ? multiCompanyDiscount(paidCount) : { percent: 0, reason: "" };
  const breakdown = applyDiscount(plan !== "free" ? planPrice(plan) : 0, rule.percent);

  async function submit(override?: boolean) {
    void override;
    setErr(""); setBusy(true);
    const res = await fetch("/api/company/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, plan }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setResult({ companyId: d.companyId, proforma: d.proforma ?? null }); setStep(4); }
    else setErr(d.error ?? t("myCompanies.wizard.err"));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 560, width: "100%", padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>{t("myCompanies.add")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>×</button>
        </div>
        {/* стъпки индикатор */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[1, 2, 3, 4].map((s) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "var(--brass)" : "var(--border)" }} />)}
        </div>

        {err && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{err}</div>}

        {step === 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("myCompanies.wizard.eik")}</label><input value={f.eik} onChange={(e) => set("eik", e.target.value)} onBlur={lookup} placeholder="123456789" /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("myCompanies.wizard.name")}</label><input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><label>{t("myCompanies.wizard.vat")}</label><input value={f.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BG..." /></div>
            <div><label>{t("myCompanies.wizard.vatReg")}</label><select value={f.vatRegistered ? "1" : "0"} onChange={(e) => set("vatRegistered", e.target.value === "1")}><option value="0">{t("myCompanies.wizard.vatRegNo")}</option><option value="1">{t("myCompanies.wizard.vatRegYes")}</option></select></div>
            <div><label>{t("myCompanies.wizard.city")}</label><input value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><label>{t("myCompanies.wizard.mol")}</label><input value={f.mol} onChange={(e) => set("mol", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("myCompanies.wizard.address")}</label><input value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div><label>{t("myCompanies.wizard.email")}</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label>{t("myCompanies.wizard.phone")}</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PLAN_KEYS.map((p) => (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${plan === p ? "var(--brass)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer" }}>
                <input type="radio" checked={plan === p} onChange={() => setPlan(p)} style={{ width: "auto" }} />
                <span style={{ flex: 1, fontWeight: 600 }}>{t(`pricing.plans.${p}.name`)}</span>
                <span className="num" style={{ color: "var(--muted)" }}>{p === "free" ? t("myCompanies.wizard.freePrice") : formatCurrency(planPrice(p))}</span>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ fontSize: 14 }}>
            {plan === "free" ? (
              <div style={{ color: "var(--ink-soft)" }}>{t("myCompanies.wizard.freeNoPay")}</div>
            ) : (
              <div className="glass" style={{ padding: "14px 16px", borderRadius: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{t("myCompanies.wizard.standard")}</span><span className="num">{formatCurrency(breakdown.standard)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "var(--emerald-dark)" }}><span>{t("myCompanies.wizard.discount")} ({breakdown.percent}%)</span><span className="num">−{formatCurrency(breakdown.discount)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 8, fontWeight: 700, fontSize: 16 }}><span>{t("myCompanies.wizard.final")}</span><span className="num">{formatCurrency(breakdown.final)}</span></div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{paidCount === 0 ? t("myCompanies.wizard.firstFree") : t("myCompanies.wizard.additional")}</div>
              </div>
            )}
          </div>
        )}

        {step === 4 && result && (
          <div style={{ fontSize: 14 }}>
            <div style={{ color: "var(--emerald-dark)", fontWeight: 600, marginBottom: 10 }}>{t("myCompanies.wizard.created")}</div>
            {result.proforma ? (
              <div className="glass" style={{ padding: "12px 14px", borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13 }}>{t("myCompanies.wizard.proforma")}: <strong>{result.proforma.number}</strong></div>
                <a href={`/p/${result.proforma.token}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>{t("myCompanies.wizard.viewProforma")}</a>
              </div>
            ) : (
              <div style={{ color: "var(--muted)", marginBottom: 12 }}>{t("myCompanies.wizard.freeNoPay")}</div>
            )}
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => onCreated(result.companyId)}>{t("myCompanies.enter")}</button>
          </div>
        )}

        {/* навигация */}
        {step < 4 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => step === 1 ? onClose() : setStep(step - 1)}>{step === 1 ? t("myCompanies.wizard.cancel") : t("myCompanies.wizard.back")}</button>
            {step < 3 && <button className="btn btn-primary btn-sm" disabled={step === 1 && (!f.eik.trim() || !f.name.trim())} onClick={() => setStep(step + 1)}>{t("myCompanies.wizard.next")}</button>}
            {step === 3 && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => submit()}>{busy ? "…" : (plan === "free" ? t("myCompanies.wizard.finish") : t("myCompanies.wizard.toPayment"))}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
