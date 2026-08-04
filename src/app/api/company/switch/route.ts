import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, ACTIVE_COMPANY_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { z } from "zod";

// Превключване на активната фирма за собственик с няколко фирми („Моите фирми").
// Различно от /api/firm/switch (счетоводни къщи) — тук единственото условие е
// потребителят да е член на целевата фирма. Само сменя ACTIVE_COMPANY_COOKIE;
// сесията остава същата. Данните навсякъде минават през companyId → пълна изолация.
const schema = z.object({ companyId: z.string() });

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const { companyId } = schema.parse(await req.json());

    // Потребителят трябва да е член на целевата фирма (scoping срещу IDOR).
    const member = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { companyId: true, company: { select: { isAccountingFirm: true, managedByFirmId: true, archivedAt: true } } },
    });
    if (!member) return NextResponse.json({ error: "Нямате достъп до тази фирма." }, { status: 403 });
    if (member.company.archivedAt) return NextResponse.json({ error: "Фирмата е архивирана." }, { status: 400 });
    // Счетоводни къщи и управлявани клиентски фирми се превключват през /api/firm/switch.
    if (member.company.isAccountingFirm || member.company.managedByFirmId) {
      return NextResponse.json({ error: "Тази фирма се управлява през работното място на счетоводната къща." }, { status: 400 });
    }

    const jar = await cookies();
    jar.set(ACTIVE_COMPANY_COOKIE, companyId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
