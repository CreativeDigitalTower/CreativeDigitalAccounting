import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { validateCompanyIdentity, normalizeCountryCode } from "@/lib/validation/companyIdentity";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  countryCode: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  eik: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  vatRegistered: z.boolean().optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  bankIban: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBic: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  defaultCurrency: z.string().optional(),
  defaultLanguage: z.string().optional(),
  invoiceTemplate: z.string().optional(),
  invoiceNumberStart: z.number().int().min(1).optional(),
  defaultVatExempt: z.boolean().optional(),
  defaultVatExemptReason: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const company = await prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } });
    return NextResponse.json({ ...company, plan: company?.subscription?.plan ?? "free" });
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();

    // Само owner/manager могат да редактират фирмените данни
    const role = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { role: true },
    });
    if (!role || !["owner", "manager"].includes(role.role)) {
      return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    // Държавата определя каква валидация се прилага. Ако не е подадена изрично,
    // ползваме текущата на фирмата (обратна съвместимост за BG).
    const current = await prisma.company.findUnique({ where: { id: companyId }, select: { countryCode: true } });
    const countryCode = normalizeCountryCode(data.countryCode ?? current?.countryCode);

    // ── Валидация според държава + уникалност (само ако идентификаторът е попълнен) ──
    const hasEik = data.eik != null && String(data.eik).trim() !== "";
    const hasReg = data.registrationNumber != null && String(data.registrationNumber).trim() !== "";
    if (hasEik || hasReg || data.countryCode != null) {
      const idCheck = validateCompanyIdentity({ countryCode, eik: data.eik, registrationNumber: data.registrationNumber }, { requireIdentifier: false });
      if (!idCheck.ok) return NextResponse.json({ error: idCheck.error }, { status: 400 });
      data.countryCode = idCheck.countryCode;
      data.eik = idCheck.eik;
      data.registrationNumber = idCheck.registrationNumber;
      if (idCheck.isBg && idCheck.eik) {
        const dup = await prisma.company.findFirst({ where: { eik: idCheck.eik, id: { not: companyId } }, select: { id: true } });
        if (dup) return NextResponse.json({ error: "Фирма с този ЕИК/БУЛСТАТ вече е регистрирана." }, { status: 400 });
      } else if (!idCheck.isBg && idCheck.registrationNumber) {
        const dup = await prisma.company.findFirst({ where: { countryCode: idCheck.countryCode, registrationNumber: idCheck.registrationNumber, id: { not: companyId } }, select: { id: true } });
        if (dup) return NextResponse.json({ error: "Фирма с този регистрационен номер вече е регистрирана." }, { status: 400 });
      }
    }

    // ── ДДС логика: при „Регистрирана по ЗДДС" номерът е задължителен ──
    if (data.vatRegistered === true && !(data.vatNumber && String(data.vatNumber).trim())) {
      return NextResponse.json({ error: "При регистрация по ЗДДС е задължителен ДДС номер." }, { status: 400 });
    }
    // Ако фирмата е регистрирана — по подразбиране НЕ е освободена от ДДС.
    if (data.vatRegistered === true) {
      data.defaultVatExempt = false;
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    await audit(companyId, userId, "update", "Company", companyId, "Редакция на фирмени данни");
    return NextResponse.json(company);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
