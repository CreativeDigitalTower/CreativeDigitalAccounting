import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { TRIAL_DAYS } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({ plan: z.enum(["business", "pro"]) });

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

    await audit(companyId, userId, "update", "Subscription", companyId, `Активиран ${TRIAL_DAYS}-дневен тест на ${plan}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
