import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { sendEmail } from "@/lib/email/send";
import { subscriptionActivatedEmail, planChangedEmail } from "@/lib/email/messages";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";
import { z } from "zod";

const schema = z.object({
  companyId: z.string(),
  plan: z.enum(["free", "start", "business", "pro"]),
  status: z.enum(["active", "cancelled", "past_due", "trialing"]).optional(),
  paymentStatus: z.enum(["received", "pending", "not_received"]).optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  trialUsed: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, plan, status, paymentStatus, periodStart, periodEnd, trialUsed } = schema.parse(await req.json());

    const prev = await prisma.subscription.findUnique({ where: { companyId }, select: { plan: true } });

    const data = {
      plan,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(periodStart !== undefined ? { currentPeriodStart: periodStart ? new Date(periodStart) : null } : {}),
      ...(periodEnd !== undefined ? { currentPeriodEnd: periodEnd ? new Date(periodEnd) : null } : {}),
      ...(trialUsed !== undefined ? { trialUsed } : {}),
    };
    await prisma.subscription.upsert({
      where: { companyId },
      update: data,
      create: { companyId, status: status ?? "active", ...data },
    });

    await logSubscriptionEvent(companyId, plan !== "free" ? "payment" : "plan_change", {
      plan, status: status ?? "active", note: `Админ: план ${plan}${periodEnd ? ` валиден до ${periodEnd}` : ""}`,
    });
    await audit(companyId, userId, "update", "Subscription", companyId, `Админ: план ${plan}${periodEnd ? ` до ${periodEnd}` : ""}`);

    // ─── Имейл към фирмата за активиране/промяна на плана ───
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true, preferredLanguage: true } } } } },
      });
      const owner = company?.companyUsers[0]?.user;
      if (owner?.email && company) {
        const loc = normalizeLocale(owner.preferredLanguage);
        const prevPlan = prev?.plan ?? "free";
        const until = periodEnd ? new Date(periodEnd).toLocaleDateString(intlLocale(loc)) : undefined;
        const m = prevPlan !== plan && prevPlan !== "free"
          ? planChangedEmail(company.name, prevPlan, plan, loc)
          : subscriptionActivatedEmail(company.name, plan, until, loc);
        await sendEmail({ to: owner.email, toName: owner.name, subject: m.subject, html: m.html, category: m.category, type: "subscription_activated", companyId });
      }
    } catch (e) { console.error("admin plan email", e); }

    // ─── Meta: активиране/промяна на абонамент (Purchase) ───
    try {
      if (plan !== "free") {
        const { sendMetaEvent, newEventId } = await import("@/lib/meta");
        const { planPrice, PLAN_ORDER } = await import("@/lib/constants").then((m) => ({ planPrice: m.planPrice, PLAN_ORDER: ["free", "start", "business", "pro"] }));
        const owner = await prisma.companyUser.findFirst({ where: { companyId, role: "owner" }, select: { user: { select: { email: true, name: true } } } });
        const prevPlan = prev?.plan ?? "free";
        const value = planPrice(plan);
        const user = { email: owner?.user.email, firstName: owner?.user.name?.split(" ")[0], externalId: companyId };
        const custom = { value, currency: "EUR", plan_name: plan, company_id: companyId };
        await sendMetaEvent({ eventName: "SubscriptionActivated", eventId: newEventId(), actionSource: "system_generated", user, custom });
        await sendMetaEvent({ eventName: "Purchase", eventId: newEventId(), actionSource: "system_generated", user, custom });
        if (prevPlan !== "free" && PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(prevPlan)) {
          await sendMetaEvent({ eventName: "SubscriptionUpgraded", eventId: newEventId(), actionSource: "system_generated", user, custom: { ...custom, from_plan: prevPlan } });
        } else if (prevPlan === plan) {
          await sendMetaEvent({ eventName: "SubscriptionRenewed", eventId: newEventId(), actionSource: "system_generated", user, custom });
        }
      }
    } catch (e) { console.error("meta plan", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
