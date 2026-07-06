import Link from "next/link";
import { requireAccountingFirm } from "@/lib/session";
import { ACCOUNTANT_PLANS, ACCOUNTANT_PLAN_FEATURES, BANK_DETAILS, EUR_TO_BGN, isPromoActive, accountantPlanLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FirmSubscriptionPage() {
  const { firm } = await requireAccountingFirm();
  const promo = isPromoActive();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href="/firm" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Табло</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Абонамент за счетоводна къща</h1>
      </div>

      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>ТЕКУЩ ПЛАН</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700 }}>{accountantPlanLabel(firm.firmPlan)}</div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", maxWidth: 420 }}>Смяната на плана се потвърждава след плащане по банков път. Свържете се с нас или изберете по-висок план по-долу.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 22 }}>
        {ACCOUNTANT_PLANS.map((p) => {
          const isCurrent = firm.firmPlan === p.id;
          const hasPromo = promo && p.regularPrice > p.price;
          const price = promo ? p.price : p.regularPrice;
          return (
            <div key={p.id} className="glass panel" style={{ padding: "22px 20px", position: "relative", border: isCurrent ? "2px solid var(--emerald)" : p.recommended ? "2px solid var(--brass)" : undefined, display: "flex", flexDirection: "column" }}>
              {isCurrent && <span style={{ position: "absolute", top: -10, left: 16, background: "var(--emerald)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Активен</span>}
              {!isCurrent && p.recommended && <span className="ribbon">Препоръчан</span>}
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, textAlign: "center" }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", minHeight: 32, marginTop: 2 }}>{p.tagline}</div>
              <div style={{ textAlign: "center", margin: "10px 0 0" }}>
                {hasPromo && <span className="num" style={{ fontSize: 14, color: "var(--muted)", textDecoration: "line-through", marginRight: 6 }}>{p.regularPrice} €</span>}
                <span className="num" style={{ fontSize: 28, fontWeight: 700, color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{price}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}> € / месец</span>
              </div>
              <div className="num" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 8 }}>≈ {(price * EUR_TO_BGN).toFixed(2)} лв/месец</div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "7px 0", marginBottom: 12 }}>
                {p.maxClients === Infinity ? "Неограничени клиентски фирми" : `До ${p.maxClients} клиентски фирми`}
              </div>
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

      <div className="glass panel" style={{ padding: "20px 24px", borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 10px" }}>Плащане по банков път</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12 }}>
          {[{ label: "Получател", value: BANK_DETAILS.recipient }, { label: "IBAN", value: BANK_DETAILS.iban }, { label: "Банка", value: BANK_DETAILS.bank }, { label: "Основание", value: `Абонамент счетоводна къща — ${firm.name}` }].map((b) => (
            <div key={b.label} style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{b.label}</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{b.value}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>След получаване на плащането активираме избрания план и издаваме фактура. Всички цени са без ДДС. 1 EUR = {EUR_TO_BGN} лв.</p>
      </div>
    </div>
  );
}
