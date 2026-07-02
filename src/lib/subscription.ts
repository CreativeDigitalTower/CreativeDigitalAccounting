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

    // ─── Имейл: абонаментът изтече (фирма + админ) ───
    try {
      const { sendEmail, notifyAdmin } = await import("@/lib/email/send");
      const { subscriptionExpiredEmail, adminSimpleEmail } = await import("@/lib/email/messages");
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } },
      });
      const owner = company?.companyUsers[0]?.user;
      if (owner?.email && company) {
        const m = subscriptionExpiredEmail(company.name, sub.plan);
        await sendEmail({ to: owner.email, toName: owner.name, subject: m.subject, html: m.html, category: m.category, type: "subscription_expired", companyId });
        const a = adminSimpleEmail("Изтекъл абонамент", [{ label: "Фирма", value: company.name }, { label: "Предишен план", value: sub.plan }], "");
        await notifyAdmin(a.subject, a.html, "admin_expired_sub");
      }
    } catch (e) { console.error("expiry email", e); }

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
