import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Управление на режим „Клиент на CDT" (billingMode). Само Super Admin.
//   action "set"    → маркира фирма като CDT клиент с избран функционален план,
//                     без такса/проформа/очаквано плащане. Опционална крайна дата.
//   action "remove" → връща фирмата към стандартно таксуване (billingMode standard).
//                     Планът НЕ се променя тук — прехвърлянето към платен/безплатен
//                     се извършва чрез обичайния /api/admin/plan поток.
// „Клиент на CDT" е billing режим, НЕ отделен план. Функционалният план остава
// start/business/pro и дава пълните права; приходите го изключват (isRevenueExcluded).
// ─────────────────────────────────────────────────────────────────────────

const schema = z.object({
  companyId: z.string(),
  action: z.enum(["set", "remove"]),
  // Само при action "set":
  plan: z.enum(["start", "business", "pro"]).optional(),
  endsAt: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSuperAdmin();
    const { companyId, action, plan, endsAt, note } = schema.parse(await req.json());

    const prev = await prisma.subscription.findUnique({
      where: { companyId },
      select: { plan: true, billingMode: true },
    });
    const prevMode = prev?.billingMode ?? "standard";

    if (action === "set") {
      if (!plan) return NextResponse.json({ error: "Изберете функционален план." }, { status: 400 });
      const now = new Date();
      const ends = endsAt ? new Date(endsAt) : null;
      await prisma.subscription.upsert({
        where: { companyId },
        update: {
          plan,
          billingMode: "cdt_client",
          status: "active",
          // CDT достъпът е без такса — маркираме плащането като „получено" от гледна
          // точка на достъпа, но приходите го изключват по billingMode, не по това.
          paymentStatus: "received",
          currentPeriodEnd: ends,
          cdtActivatedAt: now,
          cdtActivatedById: userId,
          cdtEndsAt: ends,
          cdtNote: note ?? null,
        },
        create: {
          companyId,
          plan,
          billingMode: "cdt_client",
          status: "active",
          paymentStatus: "received",
          currentPeriodEnd: ends,
          cdtActivatedAt: now,
          cdtActivatedById: userId,
          cdtEndsAt: ends,
          cdtNote: note ?? null,
        },
      });

      await logSubscriptionEvent(companyId, "plan_change", {
        plan, status: "active",
        note: `CDT клиент: план ${plan}${ends ? ` до ${ends.toISOString().slice(0, 10)}` : " (безсрочно)"}${note ? ` — ${note}` : ""}`,
      });
      await audit(companyId, userId, "update", "Subscription", companyId,
        `CDT клиент: план ${plan}${ends ? ` до ${ends.toISOString().slice(0, 10)}` : " (безсрочно)"}; предишен режим: ${prevMode}${note ? `; бележка: ${note}` : ""}`);

      return NextResponse.json({ success: true });
    }

    // action === "remove" → връщане към стандартно таксуване.
    await prisma.subscription.update({
      where: { companyId },
      data: {
        billingMode: "standard",
        cdtActivatedAt: null,
        cdtActivatedById: null,
        cdtEndsAt: null,
        cdtNote: null,
      },
    });
    await logSubscriptionEvent(companyId, "plan_change", {
      plan: prev?.plan ?? "free", status: "active",
      note: "Премахнат CDT достъп — връщане към стандартно таксуване",
    });
    await audit(companyId, userId, "update", "Subscription", companyId,
      `Премахнат CDT достъп (предишен режим: ${prevMode}); връщане към стандартно таксуване`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
