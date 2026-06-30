import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/session";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { prisma } from "@/lib/prisma";
import { sendEmail, notifyAdmin } from "@/lib/email/send";
import { subscriptionSelectedEmail, adminPaidSubEmail } from "@/lib/email/messages";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["start", "business", "pro"]),
  period: z.string().optional(),
  amount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const { plan, period, amount } = schema.parse(await req.json());
    await logSubscriptionEvent(companyId, "request", { plan, period: period ?? null, amount: amount ?? null, note: "Клиентът избра план за плащане по банков път" });

    // ─── Имейл: потвърждение към фирмата + известие към админ ───
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } },
      });
      const owner = company?.companyUsers[0]?.user;
      if (owner?.email) {
        const m = subscriptionSelectedEmail(company!.name, plan, period ?? "monthly", amount);
        await sendEmail({ to: owner.email, toName: owner.name, subject: m.subject, html: m.html, category: m.category, type: "subscription_selected", companyId });
      }
      const a = adminPaidSubEmail({ company: company?.name ?? "—", plan, amount: amount ?? 0, method: "Банков превод" });
      await notifyAdmin(a.subject, a.html, "admin_new_paid_sub");
    } catch (e) { console.error("subscription email", e); }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
