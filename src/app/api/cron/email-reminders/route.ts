import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, processQueue, ADMIN_EMAIL } from "@/lib/email/send";
import {
  subscriptionExpiringEmail, unpaidInvoiceEmail, expiringEntityEmail,
} from "@/lib/email/messages";
import { formatCurrency } from "@/lib/constants";
import { APP_URL } from "@/lib/email/templates";

const DAY = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleDateString("bg-BG");
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Изпраща всички планирани напомняния. Извиква се от планировчик (cron) веднъж дневно.
 * Защита: Authorization: Bearer <CRON_SECRET> или ?key=<CRON_SECRET>.
 * Idempotent на дневна база чрез проверка в EmailLog (type+toEmail за деня).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = req.headers.get("authorization")?.replace("Bearer ", "") || url.searchParams.get("key");
  // Fail-closed: ако CRON_SECRET не е конфигуриран, ендпойнтът е недостъпен
  // (иначе всеки би могъл да задейства масово изпращане на имейли).
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = startOfDay(new Date());
  let sent = 0;

  // helper: avoid duplicate same-type mail to same recipient within the last 20h
  async function alreadySent(type: string, to: string, key: string) {
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const hit = await prisma.emailLog.findFirst({
      where: { type, toEmail: to.toLowerCase(), subject: { contains: key }, createdAt: { gte: since } },
      select: { id: true },
    });
    return !!hit;
  }

  async function ownerOf(companyId: string) {
    const c = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, emailPrefs: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } },
    });
    return c ? { name: c.name, email: c.companyUsers[0]?.user.email, userName: c.companyUsers[0]?.user.name } : null;
  }

  // ─── 1) Изтичащ абонамент: 7 / 3 / 1 дни ───
  for (const days of [7, 3, 1]) {
    const from = new Date(today.getTime() + days * DAY);
    const to = new Date(from.getTime() + DAY);
    const subs = await prisma.subscription.findMany({
      where: { plan: { not: "free" }, currentPeriodEnd: { gte: from, lt: to } },
      select: { companyId: true, plan: true, currentPeriodEnd: true },
    });
    for (const s of subs) {
      const o = await ownerOf(s.companyId);
      if (!o?.email) continue;
      if (await alreadySent("subscription_expiring", o.email, `${days}`)) continue;
      const m = subscriptionExpiringEmail(o.name, s.plan, days, fmt(s.currentPeriodEnd!));
      await sendEmail({ to: o.email, toName: o.userName, subject: m.subject, html: m.html, category: m.category, type: "subscription_expiring", companyId: s.companyId });
      sent++;
    }
  }

  // ─── 2) Неплатени фактури: 3 / 7 / 14 дни след падежа ───
  for (const days of [3, 7, 14]) {
    const dueFrom = new Date(today.getTime() - days * DAY);
    const dueTo = new Date(dueFrom.getTime() + DAY);
    const invoices = await prisma.document.findMany({
      where: { type: "invoice", status: { not: "paid" }, dueDate: { gte: dueFrom, lt: dueTo } },
      select: { id: true, number: true, companyId: true, lines: { select: { lineTotal: true } } },
    });
    for (const inv of invoices) {
      const o = await ownerOf(inv.companyId);
      if (!o?.email) continue;
      if (await alreadySent("invoice_unpaid", o.email, inv.number)) continue;
      const total = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
      const m = unpaidInvoiceEmail(o.name, inv.number, days, formatCurrency(total), `${APP_URL}/dashboard/invoices/${inv.id}`);
      await sendEmail({ to: o.email, toName: o.userName, subject: m.subject, html: m.html, category: m.category, type: "invoice_unpaid", companyId: inv.companyId });
      sent++;
    }
  }

  // ─── 3) Изтичащи договори (до 7 дни) ───
  {
    const to = new Date(today.getTime() + 7 * DAY);
    const contracts = await prisma.contract.findMany({
      where: { endDate: { gte: today, lt: to } },
      select: { id: true, title: true, endDate: true, companyId: true },
    });
    for (const c of contracts) {
      const o = await ownerOf(c.companyId);
      if (!o?.email) continue;
      if (await alreadySent("contract_expiring", o.email, c.title)) continue;
      const m = expiringEntityEmail("contract", c.title, fmt(c.endDate!), `${APP_URL}/dashboard/contracts`);
      await sendEmail({ to: o.email, toName: o.userName, subject: m.subject, html: m.html, category: m.category, type: "contract_expiring", companyId: c.companyId });
      sent++;
    }
  }

  // ─── 4) Изтичащи проекти (краен срок до 7 дни) ───
  {
    const to = new Date(today.getTime() + 7 * DAY);
    const projects = await prisma.project.findMany({
      where: { deadline: { gte: today, lt: to } },
      select: { id: true, name: true, deadline: true, companyId: true },
    });
    for (const p of projects) {
      const o = await ownerOf(p.companyId);
      if (!o?.email) continue;
      if (await alreadySent("project_expiring", o.email, p.name)) continue;
      const m = expiringEntityEmail("project", p.name, fmt(p.deadline!), `${APP_URL}/dashboard/projects`);
      await sendEmail({ to: o.email, toName: o.userName, subject: m.subject, html: m.html, category: m.category, type: "project_expiring", companyId: p.companyId });
      sent++;
    }
  }

  // ─── 5) Обработка на опашката / изтекли мейли ───
  const { retried } = await processQueue();

  return NextResponse.json({ ok: true, sent, retried, admin: ADMIN_EMAIL, ranAt: new Date().toISOString() });
}
