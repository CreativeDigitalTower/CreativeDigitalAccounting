import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  companyId: z.string(),
  plan: z.enum(["free", "start", "business", "pro"]),
  status: z.enum(["active", "cancelled", "past_due", "trialing"]).optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  trialUsed: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, plan, status, periodStart, periodEnd, trialUsed } = schema.parse(await req.json());

    const data = {
      plan,
      ...(status ? { status } : {}),
      ...(periodStart !== undefined ? { currentPeriodStart: periodStart ? new Date(periodStart) : null } : {}),
      ...(periodEnd !== undefined ? { currentPeriodEnd: periodEnd ? new Date(periodEnd) : null } : {}),
      ...(trialUsed !== undefined ? { trialUsed } : {}),
    };
    await prisma.subscription.upsert({
      where: { companyId },
      update: data,
      create: { companyId, status: status ?? "active", ...data },
    });

    await audit(companyId, userId, "update", "Subscription", companyId, `Админ: план ${plan}${periodEnd ? ` до ${periodEnd}` : ""}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
