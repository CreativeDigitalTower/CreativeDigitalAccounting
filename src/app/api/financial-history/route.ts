import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  year: z.number().int().min(1990).max(2100),
  revenue: z.number().min(0),
  profit: z.number().optional().nullable(),
  employeeCount: z.number().int().min(0).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("analytics");
    const data = schema.parse(await req.json());
    const row = await prisma.financialHistory.upsert({
      where: { companyId_year: { companyId, year: data.year } },
      update: { revenue: data.revenue, profit: data.profit ?? null, employeeCount: data.employeeCount ?? null },
      create: { companyId, year: data.year, revenue: data.revenue, profit: data.profit ?? null, employeeCount: data.employeeCount ?? null },
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
    if (!year) return NextResponse.json({ error: "Липсва година." }, { status: 400 });
    await prisma.financialHistory.deleteMany({ where: { companyId, year } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
