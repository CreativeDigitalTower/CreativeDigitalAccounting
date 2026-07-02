import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

async function owned(companyId: string, employeeId: string) {
  const e = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
  return !!e && e.companyId === companyId;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json([], { status: 200 });
    const bonuses = await prisma.employeeBonus.findMany({
      where: { employeeId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(bonuses);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
  amount: z.number().positive(),
  kind: z.enum(["cash", "voucher", "performance", "holiday", "other"]).default("cash"),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const bonus = await prisma.employeeBonus.create({ data: { employeeId: id, ...data, note: data.note ?? null } });
    return NextResponse.json(bonus);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const bonusId = new URL(req.url).searchParams.get("bonusId");
    if (!bonusId) return NextResponse.json({ error: "Липсва bonusId." }, { status: 400 });
    await prisma.employeeBonus.deleteMany({ where: { id: bonusId, employeeId: id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
