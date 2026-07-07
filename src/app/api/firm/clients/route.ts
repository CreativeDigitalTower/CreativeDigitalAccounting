import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getMyFirm } from "@/lib/session";
import { accountantMaxClients } from "@/lib/constants";
import { validateEik } from "@/lib/validation/eik";
import { notifyAdmin } from "@/lib/email/send";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional().nullable(),
  vatRegistered: z.boolean().optional(),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
});

// Създаване на нова клиентска фирма под счетоводната къща.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const userId = session.user!.id as string;
    const firm = await getMyFirm(userId);
    if (!firm) return NextResponse.json({ error: "Само за счетоводни къщи." }, { status: 403 });

    // Функцията се активира след потвърдено плащане на счетоводния план.
    const firmSub = await prisma.subscription.findUnique({ where: { companyId: firm.id }, select: { paymentStatus: true } });
    if (firmSub?.paymentStatus !== "received") {
      return NextResponse.json({ error: "Добавянето на клиенти се активира след потвърждение на плащане на плана." }, { status: 403 });
    }

    const d = schema.parse(await req.json());

    // Лимит според тарифата
    const max = accountantMaxClients(firm.firmPlan);
    const current = await prisma.company.count({ where: { managedByFirmId: firm.id } });
    if (current >= max) {
      return NextResponse.json({ error: `Достигнахте лимита от ${max === Infinity ? "∞" : max} клиентски фирми за плана си. Надградете тарифата, за да добавите повече.` }, { status: 403 });
    }

    // ЕИК: по избор, но ако е въведен — валидираме и проверяваме за дублиране
    let eik: string | null = null;
    if (d.eik && d.eik.trim()) {
      const check = validateEik(d.eik.trim());
      if (!check.isValid) return NextResponse.json({ error: check.error ?? "Невалиден ЕИК/БУЛСТАТ." }, { status: 400 });
      eik = check.normalized;
      const dup = await prisma.company.findFirst({ where: { eik }, select: { id: true } });
      if (dup) return NextResponse.json({ error: "Фирма с този ЕИК вече съществува в платформата." }, { status: 400 });
    }

    const vatReg = !!d.vatRegistered && !!(d.vatNumber && d.vatNumber.trim());

    const company = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: {
          name: d.name, eik, managedByFirmId: firm.id,
          vatRegistered: vatReg, vatNumber: d.vatNumber?.trim() || null,
          defaultVatExempt: !vatReg, defaultVatExemptReason: vatReg ? null : "art113_9",
          address: d.address || null, city: d.city || null, mol: d.mol || null,
          phone: d.phone || null, email: d.email || null, sector: d.sector || null,
          referralSource: "accounting_firm",
          // Клиентът получава базово СТАРТ достъп; статус „активна".
          clientStatus: "active", activatedAt: new Date(),
        },
      });
      // Счетоводителят получава пълен достъп до клиентската фирма
      await tx.companyUser.create({ data: { userId, companyId: c.id, role: "owner" } });
      // Абонамент (за консистентност; ефективният план е Про през managedByFirmId)
      await tx.subscription.create({ data: { companyId: c.id, plan: "free" } });
      // Начални категории разходи + склад
      const cats = ["Наем", "Заплати", "Транспорт", "Маркетинг", "Офис консумативи", "IT и Софтуер", "Комунални услуги", "Банкови такси", "Данъци и такси", "Други"];
      await tx.expenseCategory.createMany({ data: cats.map((name) => ({ companyId: c.id, name, isCustom: false })) });
      await tx.warehouse.create({ data: { companyId: c.id, name: "Главен склад" } });
      return c;
    });

    // Известие към Супер Админ за нов клиент на счетоводна къща
    try {
      await notifyAdmin(
        `Нов клиент на счетоводна къща — ${firm.name}`,
        `<p>Счетоводна къща <strong>${firm.name}</strong> добави нова клиентска фирма: <strong>${company.name}</strong> (безплатен СТАРТ достъп).</p>`,
        "admin_firm_new_client"
      );
    } catch (e) { console.error("firm client notify", e); }

    return NextResponse.json({ success: true, companyId: company.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
