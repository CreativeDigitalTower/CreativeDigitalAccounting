import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { validateUpload } from "@/lib/fileSecurity";
import { audit } from "@/lib/documents";
import { calculateLeaveDays } from "@/lib/workingDays";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["leave", "sick", "unpaid", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  note: z.string().optional().nullable(),
  docName: z.string().optional().nullable(),
  docMimeType: z.string().optional().nullable(),
  docDataUrl: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("employees");
    const { id } = await params;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    if (data.docDataUrl) {
      const v = validateUpload({ mimeType: data.docMimeType, dataUrl: data.docDataUrl });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // Централизирано изчисляване: приспадат се само РАБОТНИ дни (без уикенди и
    // официални празници). НЕ използваме endDate − startDate.
    const breakdown = calculateLeaveDays(data.type, data.startDate, data.endDate);
    if (!breakdown.valid) {
      return NextResponse.json({ error: breakdown.error === "end_before_start" ? "Крайната дата е преди началната." : "Невалидни дати." }, { status: 400 });
    }
    if (breakdown.workingDays === 0) {
      return NextResponse.json({ error: "Избраният период не съдържа работни дни по графика на служителя." }, { status: 400 });
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const leave = await prisma.employeeLeave.create({
      data: {
        employeeId: id, type: data.type, startDate: start, endDate: end,
        days: breakdown.workingDays, note: data.note ?? null,
        docName: data.docName ?? null, docMimeType: data.docMimeType ?? null, docDataUrl: data.docDataUrl ?? null,
      },
      select: { id: true, type: true, startDate: true, endDate: true, days: true, note: true, docName: true },
    });

    await audit(companyId, userId, "create", "EmployeeLeave", leave.id,
      `${emp.name}: ${data.type} ${data.startDate}–${data.endDate} · ${breakdown.workingDays} раб. дни (кал. ${breakdown.calendarDays}, уикенд ${breakdown.weekendDays}, празници ${breakdown.holidayDays})`);

    return NextResponse.json({ ...leave, breakdown });
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
