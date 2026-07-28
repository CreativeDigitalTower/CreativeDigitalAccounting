import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getMyRole } from "@/lib/session";
import { audit } from "@/lib/documents";
import { canTrash } from "@/lib/permissions";

// Окончателно изтриване — премахва физически записа (и приложенията чрез cascade).
// Само от Кошчето и само за собственик на фирмата. Номерът остава използван
// (не се преиздава), тъй като генераторът пази максималния използван номер.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    if (!canTrash(await getMyRole(userId, companyId), "permanent")) return NextResponse.json({ error: "Нямате право да изтривате окончателно." }, { status: 403 });
    const { id } = await params;
    const doc = await prisma.document.findUnique({ where: { id }, select: { companyId: true, number: true, deletedAt: true } });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (!doc.deletedAt) return NextResponse.json({ error: "Документът трябва първо да е в Кошчето." }, { status: 400 });
    await prisma.document.delete({ where: { id } });
    await audit(companyId, userId, "permanent_delete", "Document", id, `Окончателно изтрит: ${doc.number}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
