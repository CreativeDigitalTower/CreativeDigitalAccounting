import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/session";
import { z } from "zod";

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export async function GET() {
  try {
    const { employee } = await requireEmployee();
    const leaves = await prisma.employeeLeave.findMany({
      where: { employeeId: employee.id },
      select: { id: true, type: true, startDate: true, endDate: true, days: true, note: true, status: true, requestedByEmployee: true, reviewNote: true },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(leaves);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

const schema = z.object({
  type: z.enum(["leave", "sick", "unpaid", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  note: z.string().optional().nullable(),
});

// Служителят подава заявка за отпуск → отива за одобрение при работодателя.
export async function POST(req: Request) {
  try {
    const { employee } = await requireEmployee();
    const data = schema.parse(await req.json());
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) return NextResponse.json({ error: "Крайната дата е преди началната." }, { status: 400 });
    const leave = await prisma.employeeLeave.create({
      data: {
        employeeId: employee.id, type: data.type, startDate: start, endDate: end,
        days: daysBetween(start, end), note: data.note ?? null,
        status: "pending", requestedByEmployee: true,
      },
      select: { id: true, type: true, startDate: true, endDate: true, days: true, note: true, status: true, requestedByEmployee: true, reviewNote: true },
    });
    return NextResponse.json(leave);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Служителят може да оттегли само СВОЯ ЧАКАЩА заявка.
export async function DELETE(req: Request) {
  try {
    const { employee } = await requireEmployee();
    const leaveId = new URL(req.url).searchParams.get("leaveId");
    if (!leaveId) return NextResponse.json({ error: "Липсва leaveId." }, { status: 400 });
    await prisma.employeeLeave.deleteMany({
      where: { id: leaveId, employeeId: employee.id, status: "pending", requestedByEmployee: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
