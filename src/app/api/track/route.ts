import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Лек ендпойнт за регистриране на посещение (вкл. анонимни посетители).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const visitorId = String(body.visitorId ?? "anon").slice(0, 64);
    const path = String(body.path ?? "/").slice(0, 200);
    const area = body.area === "app" ? "app" : "public";

    let userId: string | null = null;
    let companyId: string | null = null;
    if (area === "app") {
      const session = await auth();
      userId = (session?.user?.id as string) ?? null;
      if (userId) {
        const cu = await prisma.companyUser.findFirst({ where: { userId }, select: { companyId: true } });
        companyId = cu?.companyId ?? null;
      }
    }

    // Записваме само ЕДНО посещение на посетител за СТРАНИЦА за деня — така
    // прегледите се броят по страници (вкл. /login и /register), без презарежданията.
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const existing = await prisma.siteVisit.findFirst({
      where: { visitorId, area, path, createdAt: { gte: dayStart } },
      select: { id: true, userId: true },
    });
    if (existing) {
      // Допълваме потребителя/фирмата, ако посетителят се е логнал по-късно същия ден.
      if (userId && !existing.userId) {
        await prisma.siteVisit.update({ where: { id: existing.id }, data: { userId, companyId } });
      }
    } else {
      await prisma.siteVisit.create({ data: { visitorId, path, area, userId, companyId } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
