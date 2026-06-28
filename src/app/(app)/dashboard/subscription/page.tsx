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

      {/* Plans grid + плащане по банков път (със СУМА) */}
      <SubscriptionPlans currentPlan={currentPlan} trialUsed={subscription?.trialUsed ?? false} bank={BANK_DETAILS} />

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, maxWidth: 680 }}>
        Към момента абонаментите се заплащат само по банков път; скоро ще добавим и плащане с карта.
        При смяна на план промяната влиза в сила след потвърждаване на плащането. След изтичане на платения период
        профилът автоматично се връща към Безплатен. 7 дни безплатен тест (еднократно) на Бизнес и Про плановете.
      </p>
    </>
  );
}
