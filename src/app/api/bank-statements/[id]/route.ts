import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

// Сваляне на файла (data URL) на извлечение
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const item = await prisma.bankStatement.findUnique({ where: { id } });
    if (!item || item.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
    }
    return NextResponse.json({ fileUrl: item.fileUrl, name: item.name });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const item = await prisma.bankStatement.findUnique({ where: { id } });
    if (!item || item.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
    }
    await prisma.bankStatement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
