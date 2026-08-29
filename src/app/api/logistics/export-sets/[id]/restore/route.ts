import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";

// Възстановяване от Кошчето (§7). Company-scoped: само собственикът връща своя запис.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  const { id } = await params;
  const set = await prisma.exportDocumentSet.findFirst({ where: { id, companyId: g.companyId, deletedAt: { not: null } }, select: { id: true, invoiceNumber: true } });
  if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  await prisma.exportDocumentSet.update({ where: { id }, data: { deletedAt: null, deletedById: null, deleteReason: null } });
  await audit(g.companyId, g.userId, "restore", "ExportDocumentSet", id, `EXPORT_DELIVERY_RESTORED ${set.invoiceNumber}`);
  return NextResponse.json({ ok: true });
}
