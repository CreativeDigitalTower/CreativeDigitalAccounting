import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getMyRole } from "@/lib/session";
import { audit } from "@/lib/documents";
import { canTrash } from "@/lib/permissions";

// Възстановяване от Кошчето — документът се връща непроменен (PDF/приложения/
// история/плащания/проследяване се пазят). Номерът остава същият.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    if (!canTrash(await getMyRole(userId, companyId), "restore")) return NextResponse.json({ error: "Нямате право да възстановявате документи." }, { status: 403 });
    const { id } = await params;
    const doc = await prisma.document.findUnique({ where: { id }, select: { companyId: true, number: true, deletedAt: true } });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (!doc.deletedAt) return NextResponse.json({ success: true });
    await prisma.document.update({ where: { id }, data: { deletedAt: null, deletedById: null, deleteReason: null } });
    await audit(companyId, userId, "restore", "Document", id, `Възстановен от Кошчето: ${doc.number}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
