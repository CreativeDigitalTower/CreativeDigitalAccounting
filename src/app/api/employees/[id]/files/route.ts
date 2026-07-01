import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const MAX = 5 * 1024 * 1024;

async function owned(companyId: string, employeeId: string) {
  const e = await prisma.employee.findUnique({ where: { id: employeeId } });
  return e && e.companyId === companyId;
}

const schema = z.object({
  name: z.string().min(1),
  docType: z.string().optional().nullable(),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX, "Файлът е твърде голям (макс. 5 MB)."),
  dataUrl: z.string().min(1),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json([], { status: 200 });
    const files = await prisma.employeeFile.findMany({
      where: { employeeId: id },
      select: { id: true, name: true, docType: true, mimeType: true, size: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const file = await prisma.employeeFile.create({
      data: { employeeId: id, ...data },
      select: { id: true, name: true, docType: true, mimeType: true, size: true, uploadedAt: true },
    });
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const fileId = new URL(req.url).searchParams.get("fileId");
    if (!fileId) return NextResponse.json({ error: "Липсва fileId." }, { status: 400 });
    await prisma.employeeFile.delete({ where: { id: fileId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
