import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/session";
import { fileResponse } from "@/lib/fileSecurity";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { employee } = await requireEmployee();
    const { fileId } = await params;
    const file = await prisma.employeeFile.findFirst({ where: { id: fileId, employeeId: employee.id } });
    if (!file) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const base64 = file.dataUrl.includes(",") ? file.dataUrl.split(",")[1] : file.dataUrl;
    return fileResponse(Buffer.from(base64, "base64"), file.mimeType, file.name, false);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
