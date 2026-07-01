import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  targetRevenue: z.number().min(0),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("analytics");
    const { year, targetRevenue } = schema.parse(await req.json());
    const goal = await prisma.financialGoal.upsert({
      where: { companyId_year: { companyId, year } },
      update: { targetRevenue },
      create: { companyId, year, targetRevenue },
    });
    return NextResponse.json(goal);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId } = await requireFeature("analytics");
    const year = Number(new URL(req.url).searchParams.get("year"));
    if (!year) return NextResponse.json({ error: "Липсва година." }, { status: 400 });
    await prisma.financialGoal.deleteMany({ where: { companyId, year } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
