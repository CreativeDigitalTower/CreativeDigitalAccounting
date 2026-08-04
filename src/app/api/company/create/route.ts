import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateEik } from "@/lib/validation/eik";
import { planPrice, type PlanId } from "@/lib/constants";
import { multiCompanyDiscount, applyDiscount } from "@/lib/discount";
import { countPaidOwnedCompanies } from "@/lib/myCompanies";
import { generateSubscriptionProforma } from "@/lib/subscriptionProforma";
import { audit } from "@/lib/documents";
import { z } from "zod";

// „Моите фирми" → добавяне на нова собствена фирма от съществуващ профил.
// Създава обикновена Company (isAccountingFirm=false, managedByFirmId=null) +
// CompanyUser(owner) + Subscription — идентична на нормална регистрация, така че
// всички съществуващи функции и per-company изолация важат директно.
const schema = z.object({
  name: z.string().min(2),
  eik: z.string().min(1),
  vatNumber: z.string().optional().nullable(),
  vatRegistered: z.boolean().optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  plan: z.enum(["free", "start", "business", "pro"]).default("free"),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const data = schema.parse(await req.json());

    // ЕИК валидация (същият helper като навсякъде).
    const eikCheck = validateEik(data.eik);
    if (!eikCheck.isValid) return NextResponse.json({ error: eikCheck.error ?? "Невалиден ЕИК." }, { status: 400 });
    const eik = eikCheck.normalized;

    // Дедупликация: ако вече има фирма с този ЕИК — не създаваме нова.
    const existing = await prisma.company.findFirst({ where: { eik }, select: { id: true } });
    if (existing) {
      return NextResponse.json({
        error: "Тази фирма вече съществува. Ако сте неин собственик, можете да заявите достъп.",
        alreadyExists: true,
      }, { status: 409 });
    }

    const vatReg = !!data.vatRegistered && !!(data.vatNumber && data.vatNumber.trim());
    const plan = data.plan as PlanId;

    // Мултифирмена отстъпка: според броя ВЕЧЕ платени фирми на собственика.
    const paidCount = plan !== "free" ? await countPaidOwnedCompanies(userId) : 0;
    const rule = plan !== "free" ? multiCompanyDiscount(paidCount) : { percent: 0, reason: "" };
    const breakdown = applyDiscount(planPrice(plan), rule.percent);

    const company = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: {
          name: data.name, eik, phone: data.phone || null, email: data.email || null,
          vatNumber: data.vatNumber || null, vatRegistered: vatReg,
          defaultVatExempt: !vatReg, defaultVatExemptReason: vatReg ? null : "art113_9",
          address: data.address || null, city: data.city || null, mol: data.mol || null,
          isAccountingFirm: false, managedByFirmId: null,
          referralSource: "multi_company",
        },
      });
      await tx.companyUser.create({ data: { userId, companyId: c.id, role: "owner" } });
      await tx.subscription.create({
        data: {
          companyId: c.id, plan,
          discountPercent: rule.percent > 0 ? rule.percent : null,
          discountReason: rule.reason || null,
        },
      });
      return c;
    });

    await audit(company.id, userId, "create", "Company", company.id,
      `Нова фирма през „Моите фирми" (план ${plan}${rule.percent ? `, отстъпка ${rule.percent}%` : ""})`);

    // Проформа само за платен план с крайна сума > 0 (100% отстъпка → без проформа).
    let proforma: { token: string; number: string } | null = null;
    if (plan !== "free" && breakdown.final > 0) {
      try {
        const p = await generateSubscriptionProforma({ clientCompanyId: company.id, plan, periodLabel: "Месечно", amount: breakdown.final });
        if (p) proforma = { token: p.token, number: p.number };
      } catch (e) { console.error("multi-company proforma", e); }
    }

    return NextResponse.json({
      success: true, companyId: company.id,
      pricing: breakdown, discountReason: rule.reason || null,
      proforma,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
