import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ status: z.enum(["paid", "rejected"]) });

// Супер Админ: маркиране на заявка за комисионна като изплатена/отхвърлена.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const { status } = schema.parse(await req.json());
    const payout = await prisma.commissionPayout.findUnique({ where: { id }, select: { id: true, firmId: true, amount: true, status: true } });
    if (!payout) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    if (payout.status !== "requested") return NextResponse.json({ error: "Заявката вече е обработена." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.commissionPayout.update({ where: { id }, data: { status, paidAt: status === "paid" ? new Date() : null } });
      if (status === "paid") {
        await tx.company.update({ where: { id: payout.firmId }, data: { commissionPaidTotal: { increment: payout.amount } } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
