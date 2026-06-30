import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { parsePrefs } from "@/lib/email/prefs";
import { z } from "zod";

// Супер Админ абонира/отписва дадена фирма от всички автоматични имейли.
export async function POST(req: Request) {
  await requireSuperAdmin();
  try {
    const { companyId, enabled } = z.object({ companyId: z.string(), enabled: z.boolean() }).parse(await req.json());
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { emailPrefs: true } });
    if (!c) return NextResponse.json({ error: "Не е намерена" }, { status: 404 });
    const prefs = parsePrefs(c.emailPrefs);
    prefs.enabled = enabled;
    await prisma.company.update({ where: { id: companyId }, data: { emailPrefs: JSON.stringify(prefs) } });
    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
