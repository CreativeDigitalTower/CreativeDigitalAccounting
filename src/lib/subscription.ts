import { prisma } from "@/lib/prisma";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";

export const TRIAL_DAYS = 7;

/**
 * Връща абонамента на фирмата, като автоматично го връща към БЕЗПЛАТЕН,
 * ако платеният период (или пробният) е изтекъл.
 * Връща и флаг `justExpired`, за да можем да покажем подканващо съобщение.
 */
export async function enforceSubscription(companyId: string) {
  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) return { plan: "free" as const, status: "active", justExpired: false, trialUsed: false, currentPeriodEnd: null, currentPeriodStart: null, wasTrial: false };

  const now = new Date();
  const expired = sub.plan !== "free" && sub.currentPeriodEnd != null && new Date(sub.currentPeriodEnd) < now;

  if (expired) {
    const wasTrial = sub.status === "trialing";
    await prisma.subscription.update({
      where: { companyId },
      data: { plan: "free", status: "active" },
    });
    await logSubscriptionEvent(companyId, "expiry", { plan: "free", status: "active", note: wasTrial ? "Изтекъл пробен период" : "Изтекъл платен период" });
    return {
      plan: "free" as const, status: "active", justExpired: true, trialUsed: sub.trialUsed,
      currentPeriodEnd: sub.currentPeriodEnd, currentPeriodStart: sub.currentPeriodStart, wasTrial,
    };
  }

  return {
    plan: sub.plan, status: sub.status, justExpired: false, trialUsed: sub.trialUsed,
    currentPeriodEnd: sub.currentPeriodEnd, currentPeriodStart: sub.currentPeriodStart, wasTrial: sub.status === "trialing",
  };
}
