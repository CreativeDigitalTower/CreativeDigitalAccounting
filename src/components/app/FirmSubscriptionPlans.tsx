"use client";

import { useState } from "react";
import { ACCOUNTANT_PLANS, ACCOUNTANT_PLAN_FEATURES, BILLING_PERIODS, EUR_TO_BGN, isPromoActive } from "@/lib/constants";

export function FirmSubscriptionPlans({ currentPlan }: { currentPlan: string | null }) {
  const [period, setPeriod] = useState<(typeof BILLING_PERIODS)[number]>(BILLING_PERIODS[0]);
  const promo = isPromoActive();

  return (
    <div>
      {/* Период на плащане — същите отстъпки като стандартните планове */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
        <div className="glass" style={{ display: "inline-flex", padding: 4, borderRadius: 24, gap: 2 }}>
          {BILLING_PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p)}
              style={{ border: "none", cursor: "pointer", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                background: period.id === p.id ? "var(--emerald)" : "transparent", color: period.id === p.id ? "#fff" : "var(--ink-soft)" }}>
              {p.label}{p.discount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {ACCOUNTANT_PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          const hasPromo = promo && p.regularPrice > p.price;
          const base = promo ? p.price : p.regularPrice;
          const monthly = base * (1 - period.discount);
          const total = base * period.months * (1 - period.discount);
          return (
            <div key={p.id} className="glass panel" style={{ padding: "22px 20px", position: "relative", border: isCurrent ? "2px solid var(--emerald)" : p.recommended ? "2px solid var(--brass)" : undefined, display: "flex", flexDirection: "column" }}>
              {isCurrent && <span style={{ position: "absolute", top: -10, left: 16, background: "var(--emerald)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Активен</span>}
              {!isCurrent && p.recommended && <span className="ribbon">Препоръчан</span>}
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, textAlign: "center" }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", minHeight: 32, marginTop: 2 }}>{p.tagline}</div>
              <div style={{ textAlign: "center", margin: "10px 0 0" }}>
                {p.custom ? (
                  <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>по договаряне</span>
                ) : (
                  <>
                    {hasPromo && <span className="num" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through", marginRight: 5 }}>{(p.regularPrice * (1 - period.discount)).toFixed(0)} €</span>}
                    <span className="num" style={{ fontSize: 26, fontWeight: 700, color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{monthly.toFixed(monthly % 1 === 0 ? 0 : 2)}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}> € / мес</span>
                  </>
                )}
              </div>
              {!p.custom && period.months > 1 && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 2 }}>{total.toFixed(2)} € за {period.months} м.</div>}
              {!p.custom && period.months === 1 && <div className="num" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>≈ {(monthly * EUR_TO_BGN).toFixed(2)} лв/мес</div>}
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "7px 0", margin: "10px 0 4px" }}>
                {p.maxClients === Infinity ? "Неограничени клиенти" : `До ${p.maxClients} клиенти`}
              </div>
              <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>{p.maxUsers === Infinity ? "Неограничени потребители" : `До ${p.maxUsers} потребител${p.maxUsers > 1 ? "и" : ""}`}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {ACCOUNTANT_PLAN_FEATURES.map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "var(--ink-soft)", paddingLeft: 18, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
