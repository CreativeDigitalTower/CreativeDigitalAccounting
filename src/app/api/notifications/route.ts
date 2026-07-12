import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

// Известията се връщат като преводен ключ + payload (не финален текст) — клиентът
// (AppTopBar) ги превежда на текущия език. Виж `renderNotif` / `useT`.
type Vars = Record<string, string | number>;
type Alert = { icon: string; titleKey: string; titleVars?: Vars; bodyKey?: string; bodyVars?: Vars; href: string; tone: string };

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const in14 = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    const [stored, overdue, sub, expiringContracts, expiringStock, expiredStock, dueReminders] = await Promise.all([
      prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.document.count({ where: { companyId, type: "invoice", status: "overdue" } }),
      prisma.subscription.findUnique({ where: { companyId }, select: { plan: true, currentPeriodEnd: true } }),
      prisma.contract.count({ where: { companyId, status: "active", endDate: { gte: now, lte: soon } } }),
      prisma.stockItem.count({ where: { companyId, expiryDate: { gte: now, lte: in14 } } }),
      prisma.stockItem.count({ where: { companyId, expiryDate: { lt: now } } }),
      // Собствени задачи/напомняния: наближаващ (до 7 дни) или просрочен срок
      prisma.taxReminder.findMany({ where: { companyId, done: false, dueDate: { lte: soon } }, orderBy: { dueDate: "asc" }, take: 10 }),
    ]);

    const alerts: Alert[] = [];
    for (const r of dueReminders) {
      const days = Math.ceil((new Date(r.dueDate).getTime() - now.getTime()) / 86400000);
      const tone = days <= 7 ? "warn" : "info";
      const body = days < 0
        ? { bodyKey: "notifications.alert.taskOverdue", bodyVars: { n: -days } }
        : days === 0
          ? { bodyKey: "notifications.alert.taskToday" }
          : { bodyKey: "notifications.alert.taskRemaining", bodyVars: { n: days } };
      alerts.push({ icon: "warn", titleKey: "notifications.alert.task", titleVars: { title: r.title }, href: "/dashboard/tax-calendar", tone, ...body });
    }
    if (overdue > 0) alerts.push({ icon: "warn", titleKey: "notifications.alert.overdueInvoices", titleVars: { n: overdue }, href: "/dashboard/invoices?status=overdue", tone: "warn" });
    if (expiredStock > 0) alerts.push({ icon: "warn", titleKey: "notifications.alert.expiredStock", titleVars: { n: expiredStock }, href: "/dashboard/warehouse", tone: "warn" });
    if (expiringStock > 0) alerts.push({ icon: "⏰", titleKey: "notifications.alert.expiringStock", titleVars: { n: expiringStock }, href: "/dashboard/warehouse", tone: "info" });
    if (expiringContracts > 0) alerts.push({ icon: "info", titleKey: "notifications.alert.expiringContracts", titleVars: { n: expiringContracts }, href: "/dashboard/contracts", tone: "info" });
    if (sub?.plan && sub.plan !== "free" && sub.currentPeriodEnd) {
      const days = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 7) alerts.push({ icon: "warn", titleKey: "notifications.alert.subExpiring", titleVars: { days }, href: "/dashboard/subscription", tone: "warn" });
    }

    const unread = stored.filter((n) => !n.read).length;
    return NextResponse.json({
      unread,
      alerts,
      notifications: stored.map((n) => ({
        id: n.id, type: n.type,
        titleKey: n.titleKey, bodyKey: n.bodyKey, data: n.data,
        title: n.title, body: n.body,
        link: n.link, read: n.read, createdAt: n.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ unread: 0, alerts: [], notifications: [] });
  }
}
