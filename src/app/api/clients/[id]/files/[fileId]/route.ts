import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { fileResponse } from "@/lib/fileSecurity";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id, fileId } = await params;
    const client = await prisma.client.findUnique({ where: { id }, select: { companyId: true } });
    if (!client || client.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const file = await prisma.clientFile.findFirst({ where: { id: fileId, clientId: id } });
    if (!file) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const base64 = file.dataUrl.includes(",") ? file.dataUrl.split(",")[1] : file.dataUrl;
    const buffer = Buffer.from(base64, "base64");
    return fileResponse(buffer, file.mimeType, file.name, false);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
