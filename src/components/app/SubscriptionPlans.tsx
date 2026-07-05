"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PLAN_DETAILS, BILLING_PERIODS } from "@/components/marketing/Pricing";
import { EUR_TO_BGN, isPromoActive } from "@/lib/constants";
import { metaTrack } from "@/lib/metaClient";

type Bank = { recipient: string; iban: string; bank: string; reason: string };

export function SubscriptionPlans({ currentPlan, trialUsed, bank }: { currentPlan: string; trialUsed: boolean; bank: Bank }) {
  const router = useRouter();
  const [period, setPeriod] = useState<(typeof BILLING_PERIODS)[number]>(BILLING_PERIODS[0]);
  const [payPlanId, setPayPlanId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [proforma, setProforma] = useState<{ token: string; number: string } | null>(null);
  const [proformaLoading, setProformaLoading] = useState(false);
  const [trialMsg, setTrialMsg] = useState("");
  const promo = isPromoActive();

  useEffect(() => { try { metaTrack("ViewContent", { content_name: "Pricing", content_category: "subscription" }); } catch {} }, []);

  async function startTrial(planId: string) {
    setTrialMsg("");
    const res = await fetch("/api/subscription/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) });
    if (res.ok) {
      try { metaTrack("StartTrial", { plan_name: planId, currency: "EUR", value: 0 }); } catch {}
      router.refresh();
    } else setTrialMsg((await res.json()).error ?? "Грешка при активиране на теста.");
  }

  async function choosePay(planId: string) {
    setPayPlanId(planId);
    setPayModal(true);
    setProforma(null);
    setProformaLoading(true);
    const plan = PLAN_DETAILS.find((p) => p.id === planId);
    const amount = plan ? +(plan.price * period.months * (1 - period.discount)).toFixed(2) : 0;
    // ─── Meta: избор на абонамент ───
    try {
      metaTrack("SubscriptionSelected", { value: amount, currency: "EUR", plan_name: planId, billing_period: period.label });
      metaTrack("Subscribe", { value: amount, currency: "EUR", plan_name: planId, billing_period: period.label });
    } catch {}
    // Регистрираме заявката (видима в Супер Админ историята) и автоматично
    // генерираме проформа фактура към фирмата на клиента.
    try {
      const res = await fetch("/api/subscription/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId, period: period.label, amount }) });
      const data = await res.json().catch(() => ({}));
      if (data?.proforma?.token) setProforma(data.proforma);
    } catch { /* без проформа — банковите данни остават видими */ }
    finally { setProformaLoading(false); }
  }

  const payPlan = PLAN_DETAILS.find((p) => p.id === payPlanId);
  const payAmount = payPlan ? payPlan.price * period.months * (1 - period.discount) : 0;

  return (
    <div>
      {/* Период на плащане */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
        <div className="glass" style={{ display: "inline-flex", padding: 4, borderRadius: 24, gap: 2 }}>
          {BILLING_PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p)}
              style={{
                border: "none", cursor: "pointer", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                background: period.id === p.id ? "var(--emerald)" : "transparent",
                color: period.id === p.id ? "#fff" : "var(--ink-soft)",
              }}>
              {p.label}{p.discount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
            </button>
          ))}
        </div>
      </div>
      <p style={{ textAlign: "center", color: "var(--emerald)", fontSize: 12.5, fontWeight: 600, marginBottom: 24, minHeight: 18 }}>
        {period.discount > 0 ? `Спестявате ${period.discount * 100}% при плащане за ${period.label.toLowerCase()}` : " "}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {PLAN_DETAILS.map((plan) => {
          const promoMonthly = plan.price * (1 - period.discount);
          const regularMonthly = plan.regularPrice * (1 - period.discount);
          const total = plan.price * period.months * (1 - period.discount);
          const fullTotal = plan.price * period.months;
          const Icon = plan.Icon;
          const isCurrent = currentPlan === plan.id;
          const hasPromo = promo && plan.regularPrice > plan.price;
          return (
            <div key={plan.id} className="glass panel"
              style={{ padding: "22px 20px", position: "relative", display: "flex", flexDirection: "column", border: isCurrent ? "2px solid var(--emerald)" : plan.recommended ? "2px solid var(--brass)" : undefined }}>
              {isCurrent && <span style={{ position: "absolute", top: -10, left: 16, background: "var(--emerald)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Активен</span>}
              {!isCurrent && plan.recommended && <span className="ribbon">Препоръчан</span>}
              {!isCurrent && hasPromo && <span style={{ position: "absolute", top: 10, left: 10, background: "var(--brick)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Специална цена</span>}

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, marginTop: hasPromo && !isCurrent ? 10 : 0 }}>
                <div className="icon-tile" style={{ width: 50, height: 50 }}><Icon /></div>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, textAlign: "center" }}>{plan.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, minHeight: 32, textAlign: "center" }}>{plan.tagline}</div>

              <div style={{ margin: "10px 0 0", textAlign: "center" }}>
                {hasPromo && <span className="num" style={{ fontSize: 13.5, color: "var(--muted)", textDecoration: "line-through", marginRight: 6 }}>{regularMonthly.toFixed(regularMonthly % 1 === 0 ? 0 : 2)} €</span>}
                <span className="num" style={{ fontSize: 28, fontWeight: 700, color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{plan.price === 0 ? "0" : promoMonthly.toFixed(promoMonthly % 1 === 0 ? 0 : 2)}</span>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}> € / месец</span>
              </div>
              {plan.price > 0 && period.months > 1 && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, textAlign: "center" }}>
                  {total.toFixed(2)} € общо за {period.months} м. <span style={{ color: "var(--brass)" }}>(−{(fullTotal - total).toFixed(2)} €)</span>
                </div>
              )}
              {plan.price > 0 && period.months === 1 && (
                <div className="num" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textAlign: "center" }}>≈ {(plan.price * EUR_TO_BGN).toFixed(2)} лв/месец</div>
              )}

              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "10px 0 12px", lineHeight: 1.5, textAlign: "center" }}>{plan.blurb}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, fontStyle: "italic" }}>Подходящ за: {plan.suited}</div>

              {isCurrent ? (
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} disabled>Текущ план</button>
              ) : plan.price === 0 ? (
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} disabled>Безплатен</button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => choosePay(plan.id)} className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>
                    {currentPlan === "free" ? "Надгради" : "Смени план"}
                  </button>
                  {(plan.id === "start" || plan.id === "business") && !trialUsed && currentPlan === "free" && (
                    <button onClick={() => startTrial(plan.id)} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center", fontSize: 11.5 }}>
                      ▶ 7 дни безплатно
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {trialMsg && <div style={{ marginTop: 12, background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{trialMsg}</div>}

      {promo && (
        <div className="glass panel" style={{ marginTop: 16, padding: "14px 20px", textAlign: "center", borderLeft: "4px solid var(--brick)", background: "var(--brick-soft)", fontSize: 13 }}>
          <strong style={{ color: "var(--brick)" }}>Спестете до 20 € всеки месец.</strong> Регистрирайте се до 31.12.2026 г. и се възползвайте от специалните стартови цени на Creative Digital Accounting.
        </div>
      )}

      {/* Плащане по банков път — със СУМА според избрания план и период */}
      <div id="pay-box" className="glass panel" style={{ marginTop: 16, padding: "20px 24px", borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/></svg> Плащане по банков път</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px", maxWidth: 700 }}>
          {payPlan
            ? <>Избран план: <strong>{payPlan.name}</strong> · {period.label.toLowerCase()}. Преведете сумата по сметката по-долу. След получаване на плащането ще активираме плана Ви.</>
            : <>Изберете план по-горе с бутона „Надгради/Смени план", за да видите точната сума за плащане. Скоро ще добавим и плащане с карта.</>}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12 }}>
          {[
            { label: "Получател", value: bank.recipient },
            { label: "IBAN", value: bank.iban },
            { label: "Банка", value: bank.bank },
            { label: "Основание", value: payPlan ? `Абонамент CDA — ${payPlan.name} (${period.label})` : bank.reason },
            ...(payPlan ? [{ label: "Сума за превод", value: `${payAmount.toFixed(2)} € (≈ ${(payAmount * EUR_TO_BGN).toFixed(2)} лв)`, highlight: true }] : []),
          ].map((b) => (
            <div key={b.label} style={{ background: (b as { highlight?: boolean }).highlight ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", borderRadius: 8, padding: "12px 14px", border: `1px solid ${(b as { highlight?: boolean }).highlight ? "var(--emerald)" : "var(--border)"}` }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{b.label}</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, color: (b as { highlight?: boolean }).highlight ? "var(--emerald-dark)" : "var(--ink)" }}>{b.value}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>Всички цени са без ДДС. 1 EUR = {EUR_TO_BGN} лв.</p>
      </div>

      {/* Поп-ъп с ясни инструкции за плащане */}
      {payModal && payPlan && createPortal(
        <div onClick={() => setPayModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 3000, padding: "6vh 16px 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(560px, 100%)", padding: 28, margin: "auto", borderTop: "4px solid var(--emerald)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div className="icon-tile" style={{ width: 52, height: 52 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/></svg>
              </div>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 6px", textAlign: "center" }}>Плащане на абонамент</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", margin: "0 0 18px", lineHeight: 1.5 }}>
              Избрахте план <strong>{payPlan.name}</strong> · {period.label.toLowerCase()}.<br />
              Преведете сумата по банковата ни сметка с данните по-долу.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Получател", value: bank.recipient },
                { label: "IBAN", value: bank.iban },
                { label: "Банка", value: bank.bank },
                { label: "Основание за плащане", value: `Абонамент CDA — ${payPlan.name} (${period.label})` },
                { label: "Сума за превод", value: `${payAmount.toFixed(2)} € (≈ ${(payAmount * EUR_TO_BGN).toFixed(2)} лв)`, highlight: true },
              ].map((b) => (
                <div key={b.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: b.highlight ? "var(--emerald-soft)" : "rgba(255,255,255,.55)", borderRadius: 10, padding: "12px 16px", border: `1px solid ${b.highlight ? "var(--emerald)" : "var(--border)"}` }}>
                  <span style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .8, flexShrink: 0 }}>{b.label}</span>
                  <span className="num" style={{ fontSize: b.highlight ? 17 : 14, fontWeight: 700, color: b.highlight ? "var(--emerald-dark)" : "var(--ink)", textAlign: "right", wordBreak: "break-word" }}>{b.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, background: "var(--brass-soft)", border: "1px solid rgba(166,130,47,.3)", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              Веднага след като получим превода, ще Ви <strong>изпратим фактура</strong> за направеното плащане и <strong>незабавно ще активираме избрания абонамент</strong>.
            </div>

            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, textAlign: "center" }}>Всички цени са без ДДС. 1 EUR = {EUR_TO_BGN} лв.</p>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {proformaLoading ? (
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", minWidth: 200 }} disabled>Генериране на проформа…</button>
              ) : proforma ? (
                <a href={`/d/${proforma.token}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", minWidth: 200 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
                  Изтегли проформа фактура
                </a>
              ) : null}
              <button onClick={() => setPayModal(false)} className="btn btn-primary" style={{ flex: 1, justifyContent: "center", minWidth: 200 }}>
                Разбрах, ще извърша плащането
              </button>
            </div>
            {proforma && <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>Проформа № {proforma.number} е налична и във „Входящи документи“.</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
