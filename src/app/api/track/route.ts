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

    await prisma.siteVisit.create({ data: { visitorId, path, area, userId, companyId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
