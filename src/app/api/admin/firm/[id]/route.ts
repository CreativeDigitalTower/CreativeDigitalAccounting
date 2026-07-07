import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  partnerPercentOverride: z.number().int().min(0).max(90).nullable().optional(),
  firmPlan: z.enum(["acc_start", "acc_pro", "acc_office", "acc_enterprise"]).optional(),
  paymentStatus: z.enum(["received", "pending", "not_received"]).optional(),
});

// Супер Админ: управление на счетоводна къща — партньорски процент, абонаментен план и
// потвърждение на плащане (което активира функциите за добавяне на клиенти).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const d = schema.parse(await req.json());
    const firm = await prisma.company.findFirst({ where: { id, isAccountingFirm: true }, select: { id: true } });
    if (!firm) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

    if (d.partnerPercentOverride !== undefined || d.firmPlan !== undefined) {
      await prisma.company.update({
        where: { id },
        data: {
          ...(d.partnerPercentOverride !== undefined ? { partnerPercentOverride: d.partnerPercentOverride } : {}),
          ...(d.firmPlan !== undefined ? { firmPlan: d.firmPlan } : {}),
        },
      });
    }
    if (d.paymentStatus !== undefined) {
      await prisma.subscription.upsert({
        where: { companyId: id },
        update: { paymentStatus: d.paymentStatus, status: "active" },
        create: { companyId: id, plan: "free", status: "active", paymentStatus: d.paymentStatus },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
