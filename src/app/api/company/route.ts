import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
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
