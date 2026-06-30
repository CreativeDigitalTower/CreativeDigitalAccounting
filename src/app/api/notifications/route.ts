import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const [stored, overdue, sub, expiringContracts] = await Promise.all([
      prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.document.count({ where: { companyId, type: "invoice", status: "overdue" } }),
      prisma.subscription.findUnique({ where: { companyId }, select: { plan: true, currentPeriodEnd: true } }),
      prisma.contract.count({ where: { companyId, status: "active", endDate: { gte: now, lte: soon } } }),
    ]);

    const alerts: { icon: string; title: string; body?: string; href: string; tone: string }[] = [];
    if (overdue > 0) alerts.push({ icon: "⚠️", title: `${overdue} просрочени фактури`, href: "/dashboard/invoices?status=overdue", tone: "warn" });
    if (expiringContracts > 0) alerts.push({ icon: "📑", title: `${expiringContracts} изтичащи договора`, href: "/dashboard/contracts", tone: "info" });
    if (sub?.plan && sub.plan !== "free" && sub.currentPeriodEnd) {
      const days = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 7) alerts.push({ icon: "💳", title: `Абонаментът изтича след ${days} дни`, href: "/dashboard/subscription", tone: "warn" });
    }

    const unread = stored.filter((n) => !n.read).length;
    return NextResponse.json({
      unread,
      alerts,
      notifications: stored.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt })),
    });
  } catch {
    return NextResponse.json({ unread: 0, alerts: [], notifications: [] });
  }
}
