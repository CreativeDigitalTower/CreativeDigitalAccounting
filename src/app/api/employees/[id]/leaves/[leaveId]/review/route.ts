import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ action: z.enum(["approve", "reject"]), reviewNote: z.string().optional().nullable() });

// Работодателят одобрява/отхвърля заявка за отпуск от служител.
// Одобрените отпуски (status=approved) се калкулират в използваните дни.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; leaveId: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id, leaveId } = await params;
    const emp = await prisma.employee.findUnique({ where: { id }, select: { companyId: true } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const leave = await prisma.employeeLeave.findFirst({ where: { id: leaveId, employeeId: id } });
    if (!leave) return NextResponse.json({ error: "Не е намерена заявката." }, { status: 404 });

    const { action, reviewNote } = schema.parse(await req.json());
    const updated = await prisma.employeeLeave.update({
      where: { id: leaveId },
      data: { status: action === "approve" ? "approved" : "rejected", reviewedAt: new Date(), reviewNote: reviewNote ?? null },
    });
    return NextResponse.json({ success: true, status: updated.status });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
