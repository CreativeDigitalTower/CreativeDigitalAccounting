import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, exportSetReadRole } from "@/lib/logistics/access";

// Хронология на доставката (§20-§23) — от СЪЩЕСТВУВАЩИЯ AuditLog (§22), без нов модел.
// Събира събитията по самата доставка (entity=ExportDocumentSet) + по свързаните
// стандартни/легаси MK фактури. Автоматично — записва се от audit() при всяко действие.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const set = await prisma.exportDocumentSet.findUnique({
    where: { id },
    select: { companyId: true, buyerCompanyId: true, invoices: { select: { id: true } }, mkInvoices: { select: { id: true } } },
  });
  if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  if (!(await exportSetReadRole(g.companyId, set))) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });

  const invoiceIds = [...set.invoices.map((i) => i.id), ...set.mkInvoices.map((i) => i.id)];
  const events = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "ExportDocumentSet", entityId: id },
        ...(invoiceIds.length ? [{ entity: { in: ["Document", "MkInvoice"] }, entityId: { in: invoiceIds } }] : []),
      ],
    },
    select: { id: true, action: true, entity: true, summary: true, createdAt: true, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return NextResponse.json(events.map((e) => ({
    id: e.id, action: e.action, entity: e.entity, summary: e.summary, at: e.createdAt,
    actor: e.user?.name || e.user?.email || null,
  })));
}
