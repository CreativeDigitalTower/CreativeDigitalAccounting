import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ partnerPercentOverride: z.number().int().min(0).max(90).nullable() });

// Супер Админ: промяна на партньорския процент на счетоводна къща.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const { partnerPercentOverride } = schema.parse(await req.json());
    const firm = await prisma.company.findFirst({ where: { id, isAccountingFirm: true }, select: { id: true } });
    if (!firm) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    await prisma.company.update({ where: { id }, data: { partnerPercentOverride } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
