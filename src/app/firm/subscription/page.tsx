import Link from "next/link";
import { requireAccountingFirm } from "@/lib/session";
import { BANK_DETAILS, EUR_TO_BGN, accountantPlanLabel } from "@/lib/constants";
import { FirmSubscriptionPlans } from "@/components/app/FirmSubscriptionPlans";

export const dynamic = "force-dynamic";

export default async function FirmSubscriptionPage() {
  const { firm } = await requireAccountingFirm();

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

      <div style={{ marginBottom: 22 }}>
        <FirmSubscriptionPlans currentPlan={firm.firmPlan} />
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
