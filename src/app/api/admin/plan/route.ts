import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  companyId: z.string(),
  plan: z.enum(["free", "start", "business", "pro"]),
  status: z.enum(["active", "cancelled", "past_due", "trialing"]).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, plan, status } = schema.parse(await req.json());

    await prisma.subscription.upsert({
      where: { companyId },
      update: { plan, ...(status ? { status } : {}) },
      create: { companyId, plan, status: status ?? "active" },
    });

    await audit(companyId, userId, "update", "Subscription", companyId, `Админ смени плана на ${plan}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
