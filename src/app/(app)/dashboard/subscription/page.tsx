import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getYearMonth, SUBSCRIPTION_PLANS, planLabel, type PlanId } from "@/lib/constants";

import { BANK_DETAILS, EUR_TO_BGN } from "@/lib/constants";
import { SubscriptionPlans } from "@/components/app/SubscriptionPlans";

export default async function SubscriptionPage() {
  const { companyId } = await requireCompany();

  const [subscription, counter] = await Promise.all([
    prisma.subscription.findUnique({ where: { companyId } }),
    prisma.usageCounter.findUnique({
      where: { companyId_yearMonth: { companyId, yearMonth: getYearMonth() } },
    }),
  ]);

  const currentPlan = (subscription?.plan ?? "free") as PlanId;
  const docsUsed = counter?.documentsIssuedCount ?? 0;
  const docsLimit = SUBSCRIPTION_PLANS[currentPlan].docsPerMonth;

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Абонамент</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Управление на плана и таксуването</div>
      </div>

      {/* Current plan status */}
      <div className="glass panel" style={{ marginBottom: 24, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>ТЕКУЩ ПЛАН</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600 }}>
              {planLabel(currentPlan)}
            </div>
            {subscription?.currentPeriodEnd && (
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
                Следващо таксуване: {new Date(subscription.currentPeriodEnd).toLocaleDateString("bg-BG")}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Документи този месец</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 140, height: 8, background: "var(--brass-soft)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--brass)", width: docsLimit === Infinity ? "12%" : `${Math.min(100, (docsUsed / docsLimit) * 100)}%` }} />
              </div>
              <span className="num" style={{ fontSize: 13, color: "var(--muted)" }}>
                {docsUsed} / {docsLimit === Infinity ? "∞" : docsLimit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans grid — същите като на началната страница, с месечно/6м/годишно */}
      <SubscriptionPlans currentPlan={currentPlan} />

      {/* Банков превод */}
      <div id="bank-transfer" className="glass panel" style={{ marginTop: 24, padding: "24px 28px", borderLeft: "4px solid var(--emerald)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 6px" }}>💳 Плащане по банков път</h3>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 16px", maxWidth: 680 }}>
          Към момента абонаментите се заплащат само по банков път. За да активирате избран план,
          преведете съответната сума по сметката по-долу. <strong>Скоро ще добавим и други методи на
          плащане (карта и др.), които ще бъдат налични директно в платформата.</strong> След като
          получим плащането, ще активираме плана ви и ще ви изпратим фактура за направеното плащане.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
          {[
            { label: "Получател", value: BANK_DETAILS.recipient },
            { label: "IBAN", value: BANK_DETAILS.iban },
            { label: "Банка", value: BANK_DETAILS.bank },
            { label: "Основание", value: BANK_DETAILS.reason },
          ].map((b) => (
            <div key={b.label} style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{b.label}</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, maxWidth: 640 }}>
        Всички цени са без ДДС. 1 EUR = {EUR_TO_BGN} лв. При смяна на план, промяната влиза в сила
        след потвърждаване на плащането. 14 дни безплатен тест на Бизнес и Про плановете.
      </p>
    </>
  );
}
