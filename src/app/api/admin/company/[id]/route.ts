import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { notifyAdmin } from "@/lib/email/send";
import { adminSimpleEmail } from "@/lib/email/messages";
import { z } from "zod";

// По подразбиране DELETE = АРХИВИРАНЕ (меко). С ?permanent=1 трие завинаги.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    const { comment } = z.object({ comment: z.string().optional() }).parse(await req.json().catch(() => ({})));
    const company = await prisma.company.findUnique({ where: { id }, select: { name: true, eik: true } });
    if (!company) return NextResponse.json({ error: "Не е намерена" }, { status: 404 });

    try {
      const a = adminSimpleEmail(permanent ? "Фирма изтрита ЗАВИНАГИ от Супер Админ" : "Фирма архивирана от Супер Админ", [
        { label: "Фирма", value: company.name },
        { label: "ЕИК", value: company.eik ?? "—" },
        { label: "Коментар", value: comment || "—" },
      ], "");
      await notifyAdmin(a.subject, a.html, "admin_company_removed");
    } catch {}

    if (permanent) await prisma.company.delete({ where: { id } });
    else await prisma.company.update({ where: { id }, data: { archivedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Възстановяване на архивирана фирма
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    await prisma.company.update({ where: { id }, data: { archivedAt: null } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
