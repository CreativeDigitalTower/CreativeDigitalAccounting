import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, IMPERSONATE_COOKIE } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ companyId: z.string() });

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const { companyId } = schema.parse(await req.json());

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });

    // БЕЗ следа: не пишем нищо в одит лога на фирмата за импърсонацията.
    const res = NextResponse.json({ success: true });
    res.cookies.set(IMPERSONATE_COOKIE, companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 часа
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(IMPERSONATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
