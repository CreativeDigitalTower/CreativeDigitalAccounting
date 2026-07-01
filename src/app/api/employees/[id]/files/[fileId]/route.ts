import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const { companyId } = await requireFeature("employees");
    const { id, fileId } = await params;
    const emp = await prisma.employee.findUnique({ where: { id }, select: { companyId: true } });
    if (!emp || emp.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const file = await prisma.employeeFile.findFirst({ where: { id: fileId, employeeId: id } });
    if (!file) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const base64 = file.dataUrl.includes(",") ? file.dataUrl.split(",")[1] : file.dataUrl;
    const buffer = Buffer.from(base64, "base64");
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: { "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"` },
    });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
