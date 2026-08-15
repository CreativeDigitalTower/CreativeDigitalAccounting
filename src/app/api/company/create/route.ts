import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveContext } from "@/lib/session";
import { validateCompanyIdentity } from "@/lib/validation/companyIdentity";
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
  countryCode: z.string().optional().nullable(),
  eik: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  country: z.string().optional().nullable(), // показвано име на държавата
  vatNumber: z.string().optional().nullable(),
  vatRegistered: z.boolean().optional(),
  defaultCurrency: z.string().max(8).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  plan: z.enum(["free", "start", "business", "pro"]).default("free"),
});

export async function POST(req: Request) {
  try {
    // Ефективен контекст: при technical access собственик става ЦЕЛЕВИЯТ клиент,
    // не Super Admin-ът. Audit пази реалния actor.
    const ctx = await getEffectiveContext();
    const actorUserId = ctx.actorUserId;
    const ownerUserId = ctx.contextUserId;
    if (!ownerUserId) {
      return NextResponse.json({ error: "Целевата фирма няма собственик — задайте собственик преди добавяне на свързана фирма." }, { status: 400 });
    }
    const data = schema.parse(await req.json());

    // Валидация според държава: BG → ЕИК checksum; международна → рег. номер (без checksum).
    const idCheck = validateCompanyIdentity({ countryCode: data.countryCode, eik: data.eik, registrationNumber: data.registrationNumber });
    if (!idCheck.ok) return NextResponse.json({ error: idCheck.error }, { status: 400 });
    const { countryCode, eik, registrationNumber } = idCheck;

    // Дедупликация: BG → по ЕИК; международна → по (countryCode + регистрационен номер).
    const dupWhere = idCheck.isBg ? { eik: eik! } : { countryCode, registrationNumber: registrationNumber! };
    const existing = await prisma.company.findFirst({ where: dupWhere, select: { id: true } });
    if (existing) {
      return NextResponse.json({
        error: "Тази фирма вече съществува. Ако сте неин собственик, можете да заявите достъп.",
        alreadyExists: true,
      }, { status: 409 });
    }

    const vatReg = !!data.vatRegistered && !!(data.vatNumber && data.vatNumber.trim());
    const plan = data.plan as PlanId;

    // Мултифирмена отстъпка: според броя ВЕЧЕ платени фирми на СОБСТВЕНИКА (контекста).
    const paidCount = plan !== "free" ? await countPaidOwnedCompanies(ownerUserId) : 0;
    const rule = plan !== "free" ? multiCompanyDiscount(paidCount) : { percent: 0, reason: "" };
    const breakdown = applyDiscount(planPrice(plan), rule.percent);

    // При technical access новата фирма се присъединява към бизнес групата на target
    // фирмата (ако има) — така свързаните фирми са в общата група.
    let groupId: string | null = null;
    if (ctx.impersonating) {
      const target = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { companyGroupId: true } });
      groupId = target?.companyGroupId ?? null;
    }

    const company = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: {
          name: data.name, eik: eik ?? null, countryCode, registrationNumber: registrationNumber ?? null,
          country: data.country || (idCheck.isBg ? "България" : null),
          phone: data.phone || null, email: data.email || null,
          vatNumber: data.vatNumber || null, vatRegistered: vatReg,
          defaultCurrency: data.defaultCurrency?.trim() || undefined,
          defaultVatExempt: !vatReg, defaultVatExemptReason: vatReg ? null : "art113_9",
          address: data.address || null, city: data.city || null, mol: data.mol || null,
          isAccountingFirm: false, managedByFirmId: null,
          companyGroupId: groupId,
          referralSource: "multi_company",
        },
      });
      // Собственик е КЛИЕНТЪТ (контекста), не Super Admin actor-ът.
      await tx.companyUser.create({ data: { userId: ownerUserId, companyId: c.id, role: "owner" } });
      await tx.subscription.create({
        data: {
          companyId: c.id, plan,
          discountPercent: rule.percent > 0 ? rule.percent : null,
          discountReason: rule.reason || null,
        },
      });
      return c;
    });

    const auditNote = `Нова фирма през „Моите фирми"${ctx.impersonating ? ` (technical access → ${ctx.targetCompanyName ?? ctx.companyId})` : ""} (план ${plan}${rule.percent ? `, отстъпка ${rule.percent}%` : ""})`;
    if (ctx.impersonating) {
      // Technical access: пазим следа с реалния actor (Super Admin) + target — audit()
      // нарочно се пропуска при импърсонация, затова записваме директно.
      await prisma.auditLog.create({ data: { companyId: company.id, userId: actorUserId, action: "create_ta", entity: "Company", entityId: company.id, summary: auditNote } }).catch((e) => console.error("ta audit", e));
    } else {
      await audit(company.id, actorUserId, "create", "Company", company.id, auditNote);
    }

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
