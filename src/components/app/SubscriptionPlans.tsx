"use client";

import { useState } from "react";
import { PLAN_DETAILS, BILLING_PERIODS } from "@/components/marketing/Pricing";
import { EUR_TO_BGN, isPromoActive } from "@/lib/constants";

export function SubscriptionPlans({ currentPlan }: { currentPlan: string }) {
  const [period, setPeriod] = useState<(typeof BILLING_PERIODS)[number]>(BILLING_PERIODS[0]);
  const promo = isPromoActive();

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
                <a href="#bank-transfer" className={plan.recommended ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>
                  {currentPlan === "free" ? "Надгради" : "Смени план"}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {promo && (
        <div className="glass panel" style={{ marginTop: 16, padding: "14px 20px", textAlign: "center", borderLeft: "4px solid var(--brick)", background: "var(--brick-soft)", fontSize: 13 }}>
          <strong style={{ color: "var(--brick)" }}>СПЕЦИАЛНО ПРЕДЛОЖЕНИЕ:</strong> Абонирайте се до 31.12.2026 и запазете промоционалната си цена за целия период, през който абонаментът ви остава активен.
        </div>
      )}
    </div>
  );
}
