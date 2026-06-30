import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { TRIAL_DAYS } from "@/lib/subscription";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { sendEmail, notifyAdmin } from "@/lib/email/send";
import { subscriptionActivatedEmail, adminSimpleEmail } from "@/lib/email/messages";
import { z } from "zod";

const schema = z.object({ plan: z.enum(["start", "business"]) });

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const { plan } = schema.parse(await req.json());

    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (sub?.trialUsed) {
      return NextResponse.json({ error: "Вече сте използвали безплатния пробен период. Можете да се възползвате само веднъж." }, { status: 400 });
    }

    const start = new Date();
    const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
    await prisma.subscription.upsert({
      where: { companyId },
      update: { plan, status: "trialing", currentPeriodStart: start, currentPeriodEnd: end, trialUsed: true },
      create: { companyId, plan, status: "trialing", currentPeriodStart: start, currentPeriodEnd: end, trialUsed: true },
    });

    await logSubscriptionEvent(companyId, "trial", { plan, status: "trialing", note: `${TRIAL_DAYS}-дневен пробен период` });
    await audit(companyId, userId, "update", "Subscription", companyId, `Активиран ${TRIAL_DAYS}-дневен тест на ${plan}`);

    // ─── Имейл: потвърждение към фирмата + известие към админ ───
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } },
      });
      const owner = company?.companyUsers[0]?.user;
      if (owner?.email && company) {
        const m = subscriptionActivatedEmail(company.name, plan, end.toLocaleDateString("bg-BG"));
        await sendEmail({ to: owner.email, toName: owner.name, subject: `Активиран ${TRIAL_DAYS}-дневен тест`, html: m.html, category: "subscription", type: "trial_started", companyId });
        const a = adminSimpleEmail("Активиран безплатен пробен период", [
          { label: "Фирма", value: company.name }, { label: "План", value: plan }, { label: "Дни", value: String(TRIAL_DAYS) },
          { label: "Валиден до", value: end.toLocaleDateString("bg-BG") },
        ], "🆓");
        await notifyAdmin(a.subject, a.html, "admin_trial_started");
      }
    } catch (e) { console.error("trial email", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
