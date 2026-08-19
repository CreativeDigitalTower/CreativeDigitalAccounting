import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { REQUEST_STATUSES } from "@/lib/featureRequest/config";

// Super Admin: списък + KPI на индивидуалните заявки (§7, §17). Само Super Admin (§26).
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
  } catch { return NextResponse.json({ error: "Няма достъп." }, { status: 403 }); }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const companyId = url.searchParams.get("companyId") || undefined;

  const [rows, byStatus] = await Promise.all([
    prisma.featureRequest.findMany({
      where: { ...(status ? { status } : {}), ...(companyId ? { companyId } : {}) },
      include: { company: { select: { name: true, eik: true } }, _count: { select: { attachments: true, notes: true } } },
      orderBy: { lastActivityAt: "desc" }, take: 500,
    }),
    prisma.featureRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  const counts: Record<string, number> = {};
  for (const s of REQUEST_STATUSES) counts[s] = 0;
  for (const g of byStatus) counts[g.status] = g._count;

  // Средно време до първи отговор (проста метрика: created → lastActivity за придвижени).
  const answered = rows.filter((r) => r.status !== "new");
  const avgMs = answered.length ? answered.reduce((s, r) => s + (r.lastActivityAt.getTime() - r.createdAt.getTime()), 0) / answered.length : 0;

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id, companyName: r.company.name, eik: r.company.eik, type: r.type, title: r.title, status: r.status,
      priority: r.priority, planSnapshot: r.planSnapshot, contactEmail: r.contactEmail, createdAt: r.createdAt,
      lastActivityAt: r.lastActivityAt, attachments: r._count.attachments, notes: r._count.notes,
    })),
    kpi: { ...counts, avgResponseHours: Math.round(avgMs / 3600000 * 10) / 10 },
  });
}
