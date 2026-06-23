import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "manager", "accountant", "sales", "warehouse", "viewer"]),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("users");

    // Само owner/manager могат да канят
    const me = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { role: true },
    });
    if (!me || !["owner", "manager"].includes(me.role)) {
      return NextResponse.json({ error: "Нямате права да каните потребители." }, { status: 403 });
    }

    const { email, role } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Потребител с този имейл още няма акаунт. Помолете го първо да се регистрира, след което го добавете." },
        { status: 404 }
      );
    }

    const existing = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
    });
    if (existing) {
      await prisma.companyUser.update({
        where: { userId_companyId: { userId: user.id, companyId } },
        data: { role },
      });
    } else {
      await prisma.companyUser.create({ data: { userId: user.id, companyId, role } });
    }

    await audit(companyId, userId, "create", "CompanyUser", user.id, `${email} → ${role}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
