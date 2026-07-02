import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { fileResponse, validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

async function ownedLeave(companyId: string, employeeId: string, leaveId: string) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
  if (!emp || emp.companyId !== companyId) return null;
  return prisma.employeeLeave.findFirst({ where: { id: leaveId, employeeId } });
}

// Сваляне на прикачения към отпуска документ
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; leaveId: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id, leaveId } = await params;
    const leave = await ownedLeave(companyId, id, leaveId);
    if (!leave || !leave.docDataUrl) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const base64 = leave.docDataUrl.includes(",") ? leave.docDataUrl.split(",")[1] : leave.docDataUrl;
    const buffer = Buffer.from(base64, "base64");
    return fileResponse(buffer, leave.docMimeType ?? "application/octet-stream", leave.docName ?? "document", false);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

const putSchema = z.object({
  docName: z.string().min(1),
  docMimeType: z.string().min(1),
  docDataUrl: z.string().min(1),
});

// Замяна/прикачване на нов документ към съществуващ отпуск
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; leaveId: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id, leaveId } = await params;
    const leave = await ownedLeave(companyId, id, leaveId);
    if (!leave) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = putSchema.parse(await req.json());
    const v = validateUpload({ mimeType: data.docMimeType, dataUrl: data.docDataUrl });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    await prisma.employeeLeave.update({ where: { id: leaveId }, data });
    return NextResponse.json({ success: true, docName: data.docName });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Премахване на прикачения документ
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; leaveId: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id, leaveId } = await params;
    const leave = await ownedLeave(companyId, id, leaveId);
    if (!leave) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.employeeLeave.update({ where: { id: leaveId }, data: { docName: null, docMimeType: null, docDataUrl: null } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
