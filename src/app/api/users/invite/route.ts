import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
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

    const { email, firstName, lastName, role } = schema.parse(await req.json());
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

    let user = await prisma.user.findUnique({ where: { email } });
    let created = false;
    if (!user) {
      // Създаваме placeholder акаунт; лицето активира достъпа си чрез регистрация със същия имейл.
      user = await prisma.user.create({ data: { email, name: fullName } });
      created = true;
    } else if (fullName && !user.name) {
      await prisma.user.update({ where: { id: user.id }, data: { name: fullName } });
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
    return NextResponse.json({ success: true, pending: created });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
