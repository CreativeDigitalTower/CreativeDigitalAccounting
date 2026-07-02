import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { notifyAdmin } from "@/lib/email/send";
import { adminSimpleEmail } from "@/lib/email/messages";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    // само собственик може да изтрие фирмата
    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } }, select: { role: true },
    });
    if (membership?.role !== "owner") {
      return NextResponse.json({ error: "Само собственикът може да изтрие профила на фирмата." }, { status: 403 });
    }
    const { reason, confirm } = z.object({ reason: z.string().min(3), confirm: z.literal(true) }).parse(await req.json());

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, eik: true } });

    // известие до Супер Админ преди изтриването
    try {
      const a = adminSimpleEmail("Фирма изтри профила си", [
        { label: "Фирма", value: company?.name ?? "—" },
        { label: "ЕИК", value: company?.eik ?? "—" },
        { label: "Причина", value: reason },
      ], "");
      await notifyAdmin(a.subject, a.html, "admin_account_deleted");
    } catch {}

    // каскадно изтриване на всички данни на фирмата
    await prisma.company.delete({ where: { id: companyId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Моля потвърдете и посочете причина." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
