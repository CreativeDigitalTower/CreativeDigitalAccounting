import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
  revenue: z.number().min(0).optional(),
  expenses: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
});

// Ръчно въвеждане/корекция на месечни приходи и разходи (прехвърляне назад)
export async function PUT(req: Request) {
  try {
    const { companyId } = await requireFeature("analytics");
    const { year, month, revenue, expenses, note } = schema.parse(await req.json());
    const row = await prisma.monthlyEntry.upsert({
      where: { companyId_year_month: { companyId, year, month } },
      create: { companyId, year, month, revenue: revenue ?? 0, expenses: expenses ?? 0, note: note ?? null },
      update: { revenue: revenue ?? 0, expenses: expenses ?? 0, note: note ?? null },
    });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId } = await requireFeature("analytics");
    const year = Number(new URL(req.url).searchParams.get("year"));
    const month = Number(new URL(req.url).searchParams.get("month"));
    await prisma.monthlyEntry.deleteMany({ where: { companyId, year, month } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
