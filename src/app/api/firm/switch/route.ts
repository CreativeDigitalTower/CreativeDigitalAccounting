import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getMyFirm, ACTIVE_COMPANY_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ companyId: z.string().nullable() });

// Превключване на активната клиентска фирма за счетоводна къща.
// companyId=null → изход обратно към счетоводната къща.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const firm = await getMyFirm(userId);
    if (!firm) return NextResponse.json({ error: "Само за счетоводни къщи." }, { status: 403 });

    const { companyId } = schema.parse(await req.json());
    const jar = await cookies();

    if (!companyId) {
      jar.delete(ACTIVE_COMPANY_COOKIE);
      return NextResponse.json({ success: true, redirect: "/firm" });
    }

    // Позволяваме: собствената фирма (за издаване на нейни документи) или клиентска фирма.
    const target = companyId === firm.id
      ? { id: firm.id }
      : await prisma.company.findFirst({ where: { id: companyId, managedByFirmId: firm.id }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Невалидна фирма." }, { status: 400 });

    jar.set(ACTIVE_COMPANY_COOKIE, companyId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
