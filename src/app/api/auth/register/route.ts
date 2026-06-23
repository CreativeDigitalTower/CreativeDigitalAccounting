import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  eik: z.string().optional(),
  plan: z.enum(["free", "start", "business", "pro"]).default("free"),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Твърде много опити. Опитайте по-късно." }, { status: 429 });
    }
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Имейл адресът вече е регистриран." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash },
      });

      const company = await tx.company.create({
        data: { name: data.companyName, eik: data.eik },
      });

      await tx.companyUser.create({
        data: { userId: user.id, companyId: company.id, role: "owner" },
      });

      await tx.subscription.create({
        data: { companyId: company.id, plan: data.plan },
      });

      // Seed default expense categories
      const defaultCategories = [
        "Наем",
        "Заплати",
        "Транспорт",
        "Маркетинг",
        "Офис консумативи",
        "IT и Софтуер",
        "Комунални услуги",
        "Банкови такси",
        "Данъци и такси",
        "Други",
      ];
      await tx.expenseCategory.createMany({
        data: defaultCategories.map((name) => ({ companyId: company.id, name, isCustom: false })),
      });

      // Default warehouse
      await tx.warehouse.create({
        data: { companyId: company.id, name: "Главен склад" },
      });

      return { userId: user.id, companyId: company.id };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
