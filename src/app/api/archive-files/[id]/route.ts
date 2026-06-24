import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";

// Сваляне на файл
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("archive");
    const { id } = await params;
    const file = await prisma.archiveFile.findFirst({ where: { id, companyId } });
    if (!file) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

    const base64 = file.dataUrl.includes(",") ? file.dataUrl.split(",")[1] : file.dataUrl;
    const buffer = Buffer.from(base64, "base64");
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("archive");
    const { id } = await params;
    const file = await prisma.archiveFile.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!file) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.archiveFile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
