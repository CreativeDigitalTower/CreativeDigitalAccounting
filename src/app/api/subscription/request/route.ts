import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/session";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { prisma } from "@/lib/prisma";
import { sendEmail, notifyAdmin } from "@/lib/email/send";
import { subscriptionSelectedEmail, adminPaidSubEmail } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import { generateSubscriptionProforma } from "@/lib/subscriptionProforma";
import { type PlanId, BILLING_PERIODS, billingPeriod, effectivePeriodEuros, blackFridayActive, BLACK_FRIDAY_2026 } from "@/lib/constants";
import { z } from "zod";

const BF_LABEL = BLACK_FRIDAY_2026.name;

const schema = z.object({
  plan: z.enum(["start", "business", "pro"]),
  // Периодът може да дойде като id (monthly/semiannual/annual) ИЛИ като етикет (legacy UI).
  period: z.string().optional(),
  // Клиентската сума НЕ се използва за реалното плащане — пазим я само за одит/сравнение (§8.3).
  amount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const { plan, period, amount: clientAmount } = schema.parse(await req.json());

    // ─── Backend е авторитетният източник за сумата (§8.2/§8.3) ───
    // Разпознаваме периода по id или по етикет; при непознат → месечен.
    const periodEntry = BILLING_PERIODS.find((p) => p.id === period || p.label === period) ?? billingPeriod(period);
    // Сървърно време → важи ли Black Friday СЕГА (§10/§14). Промо цената се прилага автоматично
    // само докато кампанията е активна; след 30.11.2026 новите заявки минават по редовна цена.
    const now = new Date();
    const bfActive = blackFridayActive(now);
    const amount = effectivePeriodEuros(plan as PlanId, periodEntry.id, now);
    const periodLabelResolved = bfActive ? `${periodEntry.label} · ${BF_LABEL}` : periodEntry.label;
    // Разминаване между подадената от клиента и сървърно изчислената сума (одит; винаги печели сървърната §8.3).
    const amountMismatch = clientAmount != null && Math.abs(clientAmount - amount) > 0.001;

    // Преход CDT → платен: ако фирмата е била „Клиент на CDT" и заявява платен план,
    // връщаме я към стандартно таксуване (billingMode standard, плащане изчаква),
    // след което важи обичайният поток с проформа и потвърждение на плащане.
    const existing = await prisma.subscription.findUnique({ where: { companyId }, select: { billingMode: true } });
    if (existing?.billingMode === "cdt_client") {
      await prisma.subscription.update({
        where: { companyId },
        data: { billingMode: "standard", paymentStatus: "pending", cdtActivatedAt: null, cdtActivatedById: null, cdtEndsAt: null, cdtNote: null },
      });
      await logSubscriptionEvent(companyId, "plan_change", { plan, status: "active", note: "Преход от CDT клиент към платен абонамент" });
    }

    await logSubscriptionEvent(companyId, "request", { plan, period: periodEntry.id, amount, ...(amountMismatch ? { clientAmount } : {}), note: `Клиентът избра план за плащане по банков път${amountMismatch ? " (клиентската сума се разминаваше; използвана е сървърната)" : ""}` });

    // ─── Автоматично генериране на проформа фактура от платформената фирма ───
    let proforma: { token: string; number: string } | null = null;
    try {
      const p = await generateSubscriptionProforma({
        clientCompanyId: companyId, plan: plan as PlanId, periodLabel: periodLabelResolved, amount,
        validUntil: bfActive ? BLACK_FRIDAY_2026.endsAt : null,
      });
      if (p) proforma = { token: p.token, number: p.number };
    } catch (e) { console.error("subscription proforma", e); }

    // ─── Имейл: потвърждение към фирмата + известие към админ ───
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true, preferredLanguage: true } } } } },
      });
      const owner = company?.companyUsers[0]?.user;
      if (owner?.email) {
        const m = subscriptionSelectedEmail(company!.name, plan, periodEntry.id, amount, normalizeLocale(owner.preferredLanguage));
        await sendEmail({ to: owner.email, toName: owner.name, subject: m.subject, html: m.html, category: m.category, type: "subscription_selected", companyId });
      }
      const a = adminPaidSubEmail({ company: company?.name ?? "—", plan, amount, method: "Банков превод" });
      await notifyAdmin(a.subject, a.html, "admin_new_paid_sub");
    } catch (e) { console.error("subscription email", e); }

    return NextResponse.json({ success: true, proforma });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
