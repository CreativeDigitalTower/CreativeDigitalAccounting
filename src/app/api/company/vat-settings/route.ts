import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

export async function GET() {
  const { companyId } = await requireCompany();
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { vatRegistered: true, vatNumber: true, defaultVatExempt: true, defaultVatExemptReason: true } });
  return NextResponse.json(c ?? {});
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const d = z.object({
      vatRegistered: z.boolean().optional(),
      defaultVatExempt: z.boolean().optional(),
      defaultVatExemptReason: z.string().nullable().optional(),
    }).parse(await req.json());

    const current = await prisma.company.findUnique({ where: { id: companyId }, select: { vatNumber: true } });
    const data: Record<string, unknown> = { ...d };

    if (d.vatRegistered === true) {
      // Регистрирана: изисква ДДС номер и по подразбиране НЕ е освободена.
      if (!(current?.vatNumber && current.vatNumber.trim())) {
        return NextResponse.json({ error: "Добавете ДДС номер в профила на фирмата, преди да отбележите „Регистрирана по ЗДДС“." }, { status: 400 });
      }
      data.defaultVatExempt = false;
    } else if (d.vatRegistered === false) {
      // Нерегистрирана: по подразбиране фактурите са без ДДС с основание чл. 113, ал. 9.
      data.defaultVatExempt = true;
      if (!d.defaultVatExemptReason) data.defaultVatExemptReason = "art113_9";
    }

    await prisma.company.update({ where: { id: companyId }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
