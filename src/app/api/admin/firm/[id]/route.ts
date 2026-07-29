import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { logSubscriptionEvent } from "@/lib/subscriptionEvents";
import { accountantPlanLabel } from "@/lib/constants";
import { z } from "zod";

// Супер Админ: управление на счетоводна къща (която е Company с isAccountingFirm).
// Поддържа: партньорски процент, счетоводен план, потвърждение на плащане,
// billing mode / „Клиент на CDT", както и редакция на фирмените данни.
// Всичко изисква requireSuperAdmin и се записва в Audit Log.
const schema = z.object({
  partnerPercentOverride: z.number().int().min(0).max(90).nullable().optional(),
  firmPlan: z.enum(["acc_start", "acc_pro", "acc_office", "acc_enterprise"]).optional(),
  paymentStatus: z.enum(["received", "pending", "not_received"]).optional(),
  // billing mode / CDT
  billingMode: z.enum(["standard", "cdt_client", "internal"]).optional(),
  cdtEndsAt: z.string().nullable().optional(),
  cdtNote: z.string().max(2000).nullable().optional(),
  // редакция на фирмени данни
  details: z.object({
    name: z.string().min(2).optional(),
    eik: z.string().nullable().optional(),
    vatNumber: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    mol: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSuperAdmin();
    const { id } = await params;
    const d = schema.parse(await req.json());
    const firm = await prisma.company.findFirst({
      where: { id, isAccountingFirm: true },
      select: { id: true, firmPlan: true, subscription: { select: { billingMode: true } } },
    });
    if (!firm) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

    // ─── Партньорски процент / счетоводен план ───
    if (d.partnerPercentOverride !== undefined || d.firmPlan !== undefined) {
      await prisma.company.update({
        where: { id },
        data: {
          ...(d.partnerPercentOverride !== undefined ? { partnerPercentOverride: d.partnerPercentOverride } : {}),
          ...(d.firmPlan !== undefined ? { firmPlan: d.firmPlan } : {}),
        },
      });
      if (d.firmPlan !== undefined) {
        await logSubscriptionEvent(id, "plan_change", { plan: null, status: null, note: `Админ: счетоводен план ${accountantPlanLabel(d.firmPlan)}` });
        await audit(id, userId, "update", "Company", id, `Счетоводен план → ${accountantPlanLabel(d.firmPlan)}`);
      }
      if (d.partnerPercentOverride !== undefined) {
        await audit(id, userId, "update", "Company", id, `Партньорски процент → ${d.partnerPercentOverride ?? "по нива"}`);
      }
    }

    // ─── Статус на плащане ───
    if (d.paymentStatus !== undefined) {
      await prisma.subscription.upsert({
        where: { companyId: id },
        update: { paymentStatus: d.paymentStatus, status: "active" },
        create: { companyId: id, plan: "free", status: "active", paymentStatus: d.paymentStatus },
      });
      await audit(id, userId, "update", "Subscription", id, `Статус на плащане → ${d.paymentStatus}`);
    }

    // ─── Billing mode / „Клиент на CDT" ───
    if (d.billingMode !== undefined) {
      const prevMode = firm.subscription?.billingMode ?? "standard";
      const ends = d.cdtEndsAt ? new Date(d.cdtEndsAt) : null;
      if (d.billingMode === "cdt_client") {
        await prisma.subscription.upsert({
          where: { companyId: id },
          update: { billingMode: "cdt_client", status: "active", cdtActivatedAt: new Date(), cdtActivatedById: userId, cdtEndsAt: ends, cdtNote: d.cdtNote ?? null },
          create: { companyId: id, plan: "free", status: "active", billingMode: "cdt_client", cdtActivatedAt: new Date(), cdtActivatedById: userId, cdtEndsAt: ends, cdtNote: d.cdtNote ?? null },
        });
        await logSubscriptionEvent(id, "plan_change", { plan: null, status: "active", note: `CDT клиент (счетоводна къща): план ${accountantPlanLabel(firm.firmPlan)}${ends ? ` до ${ends.toISOString().slice(0, 10)}` : " (безсрочно)"}` });
        await audit(id, userId, "update", "Subscription", id, `CDT клиент (счет. къща)${ends ? ` до ${ends.toISOString().slice(0, 10)}` : " (безсрочно)"}; предишен режим: ${prevMode}${d.cdtNote ? `; бележка: ${d.cdtNote}` : ""}`);
      } else if (d.billingMode === "internal") {
        await prisma.subscription.upsert({
          where: { companyId: id },
          update: { billingMode: "internal", status: "active", cdtActivatedAt: null, cdtActivatedById: null, cdtEndsAt: null, cdtNote: d.cdtNote ?? null },
          create: { companyId: id, plan: "free", status: "active", billingMode: "internal", cdtNote: d.cdtNote ?? null },
        });
        await audit(id, userId, "update", "Subscription", id, `Вътрешен режим (счет. къща); предишен режим: ${prevMode}`);
      } else {
        // standard — връщане към стандартно таксуване
        await prisma.subscription.update({
          where: { companyId: id },
          data: { billingMode: "standard", cdtActivatedAt: null, cdtActivatedById: null, cdtEndsAt: null, cdtNote: null },
        });
        await logSubscriptionEvent(id, "plan_change", { plan: null, status: "active", note: "Премахнат CDT/вътрешен режим — стандартно таксуване" });
        await audit(id, userId, "update", "Subscription", id, `Стандартно таксуване (предишен режим: ${prevMode})`);
      }
    } else if (d.cdtEndsAt !== undefined || d.cdtNote !== undefined) {
      // Обновяване само на крайна дата/бележка при вече активен CDT режим.
      await prisma.subscription.update({
        where: { companyId: id },
        data: {
          ...(d.cdtEndsAt !== undefined ? { cdtEndsAt: d.cdtEndsAt ? new Date(d.cdtEndsAt) : null } : {}),
          ...(d.cdtNote !== undefined ? { cdtNote: d.cdtNote ?? null } : {}),
        },
      });
      await audit(id, userId, "update", "Subscription", id, "Обновени CDT детайли (крайна дата/бележка)");
    }

    // ─── Редакция на фирмени данни ───
    if (d.details) {
      const dd = d.details;
      await prisma.company.update({
        where: { id },
        data: {
          ...(dd.name !== undefined ? { name: dd.name } : {}),
          ...(dd.eik !== undefined ? { eik: dd.eik || null } : {}),
          ...(dd.vatNumber !== undefined ? { vatNumber: dd.vatNumber || null } : {}),
          ...(dd.address !== undefined ? { address: dd.address || null } : {}),
          ...(dd.city !== undefined ? { city: dd.city || null } : {}),
          ...(dd.mol !== undefined ? { mol: dd.mol || null } : {}),
          ...(dd.phone !== undefined ? { phone: dd.phone || null } : {}),
          ...(dd.email !== undefined ? { email: dd.email || null } : {}),
        },
      });
      await audit(id, userId, "update", "Company", id, "Редакция на фирмени данни от Супер Админ");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
