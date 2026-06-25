import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["leave", "sick", "unpaid", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  note: z.string().optional().nullable(),
});

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const leave = await prisma.employeeLeave.create({
      data: { employeeId: id, type: data.type, startDate: start, endDate: end, days: daysBetween(start, end), note: data.note ?? null },
    });
    return NextResponse.json(leave);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const leaveId = searchParams.get("leaveId");
    if (!leaveId) return NextResponse.json({ error: "Липсва leaveId." }, { status: 400 });
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.employeeLeave.delete({ where: { id: leaveId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
