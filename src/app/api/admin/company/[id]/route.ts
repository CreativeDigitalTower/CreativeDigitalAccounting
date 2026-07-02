import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { notifyAdmin } from "@/lib/email/send";
import { adminSimpleEmail } from "@/lib/email/messages";
import { z } from "zod";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const { comment } = z.object({ comment: z.string().optional() }).parse(await req.json().catch(() => ({})));
    const company = await prisma.company.findUnique({ where: { id }, select: { name: true, eik: true } });
    if (!company) return NextResponse.json({ error: "Не е намерена" }, { status: 404 });

    try {
      const a = adminSimpleEmail("Фирма изтрита от Супер Админ", [
        { label: "Фирма", value: company.name },
        { label: "ЕИК", value: company.eik ?? "—" },
        { label: "Коментар", value: comment || "—" },
      ], "");
      await notifyAdmin(a.subject, a.html, "admin_company_removed");
    } catch {}

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
