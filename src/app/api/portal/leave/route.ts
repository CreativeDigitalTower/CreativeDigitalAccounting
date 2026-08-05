import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/session";
import { calculateLeaveDays } from "@/lib/workingDays";
import { z } from "zod";

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
    // Централизирано изчисляване — само работни дни (без уикенди/празници).
    const breakdown = calculateLeaveDays(data.type, data.startDate, data.endDate);
    if (!breakdown.valid) return NextResponse.json({ error: breakdown.error === "end_before_start" ? "Крайната дата е преди началната." : "Невалидни дати." }, { status: 400 });
    if (breakdown.workingDays === 0) return NextResponse.json({ error: "Избраният период не съдържа работни дни по графика на служителя." }, { status: 400 });
    const leave = await prisma.employeeLeave.create({
      data: {
        employeeId: employee.id, type: data.type, startDate: start, endDate: end,
        days: breakdown.workingDays, note: data.note ?? null,
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
