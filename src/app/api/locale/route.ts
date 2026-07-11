import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/config";
import { z } from "zod";

const schema = z.object({ locale: z.string() });

// Записва избрания език: бисквитка (fallback) + профил на потребителя (ако е логнат).
export async function POST(req: Request) {
  try {
    const { locale } = schema.parse(await req.json());
    const norm = normalizeLocale(locale);
    const jar = await cookies();
    jar.set(LOCALE_COOKIE, norm, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    try {
      const session = await auth();
      const userId = session?.user?.id as string | undefined;
      if (userId) await prisma.user.update({ where: { id: userId }, data: { preferredLanguage: norm } });
    } catch { /* гост — само бисквитка */ }
    return NextResponse.json({ success: true, locale: norm });
  } catch {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
}
