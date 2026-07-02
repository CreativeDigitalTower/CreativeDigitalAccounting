import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan, getMyRole } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

// Кани служител да си създаде акаунт (роля employee) за портала за самообслужване.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id } = await params;

    // Само собственик/мениджър могат да канят
    const role = await getMyRole(userId, companyId);
    if (!role || !["owner", "manager"].includes(role)) {
      return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    }
    // Само за платените планове Бизнес/Про
    const plan = await getPlan(companyId);
    if (!planHasFeature(plan, "employee_portal")) {
      return NextResponse.json({ error: "Порталът за служители е достъпен само за планове Бизнес и Про." }, { status: 403 });
    }

    const emp = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!emp) return NextResponse.json({ error: "Служителят не е намерен." }, { status: 404 });

    const { email } = schema.parse(await req.json());
    const lower = email.toLowerCase();

    // Не позволяваме имейл, който вече е собственик/член на фирмата с друга роля.
    let user = await prisma.user.findUnique({ where: { email: lower }, include: { companyUsers: true } });
    if (user) {
      const other = user.companyUsers.find((cu) => cu.companyId === companyId && cu.role !== "employee");
      if (other) return NextResponse.json({ error: "Този имейл вече е потребител на фирмата с друга роля." }, { status: 400 });
      const linkedElsewhere = await prisma.employee.findFirst({ where: { userId: user.id, id: { not: id } } });
      if (linkedElsewhere) return NextResponse.json({ error: "Този имейл вече е свързан с друг служител." }, { status: 400 });
    } else {
      user = await prisma.user.create({ data: { email: lower, name: emp.name }, include: { companyUsers: true } });
    }

    await prisma.companyUser.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      create: { userId: user.id, companyId, role: "employee" },
      update: { role: "employee" },
    });
    await prisma.employee.update({ where: { id }, data: { userId: user.id, email: lower } });

    await audit(companyId, userId, "create", "Employee", id, `Покана за портал: ${lower}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалиден имейл." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Оттегляне на достъпа (премахва ролята и връзката)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id } = await params;
    const role = await getMyRole(userId, companyId);
    if (!role || !["owner", "manager"].includes(role)) {
      return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    }
    const emp = await prisma.employee.findFirst({ where: { id, companyId }, select: { userId: true } });
    if (!emp) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (emp.userId) {
      await prisma.companyUser.deleteMany({ where: { userId: emp.userId, companyId, role: "employee" } });
      await prisma.employee.update({ where: { id }, data: { userId: null } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
