import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail, notifyAdmin } from "@/lib/email/send";
import { welcomeEmail, adminNewRegistrationEmail } from "@/lib/email/messages";
import { APP_URL } from "@/lib/email/templates";
import { validateEik } from "@/lib/validation/eik";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  representativeRole: z.string().optional(),
  companyName: z.string().min(2),
  eik: z.string().min(1),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  mol: z.string().optional(),
  sector: z.string().optional(),
  plan: z.enum(["free", "start", "business", "pro"]).default("free"),
  referralSource: z.string().max(60).optional(),
  acceptTerms: z.literal(true),
  marketingConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Твърде много опити. Опитайте по-късно." }, { status: 429 });
    }
    const body = await req.json();
    const data = schema.parse(body);

    // ── Валидация на ЕИК/БУЛСТАT (формат + контролна цифра, само локално) ──
    const eikCheck = validateEik(data.eik);
    if (!eikCheck.isValid) {
      return NextResponse.json({ error: eikCheck.error ?? "Невалиден ЕИК/БУЛСТАТ." }, { status: 400 });
    }
    const eik = eikCheck.normalized;
    // ── Уникалност: да няма вече регистрирана фирма със същия ЕИК ──
    const dup = await prisma.company.findFirst({ where: { eik }, select: { id: true } });
    if (dup) {
      return NextResponse.json({ error: "Фирма с този ЕИК/БУЛСТАТ вече е регистрирана." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      include: { companyUsers: { select: { companyId: true } } },
    });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "Имейл адресът вече е регистриран." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Поканен потребител (placeholder без парола), който вече е член на фирма —
    // активира акаунта си без да създава нова фирма.
    if (existing && existing.companyUsers.length > 0) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: data.name, passwordHash, representativeRole: data.representativeRole || null,
          marketingConsent: !!data.marketingConsent, termsAcceptedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, joinedExisting: true });
    }

    const result = await prisma.$transaction(async (tx) => {
      const userData = {
        name: data.name, passwordHash, representativeRole: data.representativeRole || null,
        marketingConsent: !!data.marketingConsent, termsAcceptedAt: new Date(),
      };
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: userData })
        : await tx.user.create({ data: { email: data.email, ...userData } });

      const company = await tx.company.create({
        data: {
          name: data.companyName, eik, phone: data.phone || null, vatNumber: data.vatNumber,
          address: data.address, city: data.city, mol: data.mol, sector: data.sector,
          referralSource: data.referralSource ?? null,
        },
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

    // ─── Имейл автоматизация (не блокира регистрацията) ───
    try {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: { identifier: data.email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
      const w = welcomeEmail(data.name, verifyUrl);
      await sendEmail({ to: data.email, toName: data.name, subject: w.subject, html: w.html, category: w.category, type: "welcome", companyId: result.companyId, force: true });

      const a = adminNewRegistrationEmail({ name: data.name, company: data.companyName, eik: data.eik, email: data.email, plan: data.plan });
      await notifyAdmin(a.subject, a.html, data.plan === "free" ? "admin_new_free" : "admin_new_registration");
    } catch (e) {
      console.error("registration email error", e);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
