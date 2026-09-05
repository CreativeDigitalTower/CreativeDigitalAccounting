import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { getInvoiceSequenceInfo, isNumberTaken } from "@/lib/documents";
import { coreValue, formatInvoiceNumber } from "@/lib/invoiceNumbering";
import { z } from "zod";

// Super Admin управление на номерацията за КОНКРЕТНА фирма (§12) — без директно редактиране
// на базата. Строго scoped към подадения companyId. GET показва състоянието; POST задава
// нов следващ номер с валидация + одит (ясно означен като Super Admin, §23).
export async function GET(req: Request) {
  await requireSuperAdmin();
  const companyId = new URL(req.url).searchParams.get("companyId") ?? "";
  if (!companyId) return NextResponse.json({ error: "Липсва companyId." }, { status: 400 });
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, eik: true } });
  if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
  return NextResponse.json({ company, sequence: await getInvoiceSequenceInfo(companyId) });
}

const schema = z.object({ companyId: z.string().min(1), nextNumber: z.string().min(1).max(40) });

export async function POST(req: Request) {
  const { userId } = await requireSuperAdmin();
  try {
    const { companyId, nextNumber } = schema.parse(await req.json());
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Фирмата не е намерена." }, { status: 404 });
    const value = coreValue(nextNumber.trim());
    if (value == null || value < 1) return NextResponse.json({ error: "Въведете валиден номер (само цифри)." }, { status: 400 });
    const formatted = formatInvoiceNumber(value, 10);
    if (await isNumberTaken(companyId, formatted)) {
      return NextResponse.json({ error: `Фактура № ${formatted} вече съществува.` }, { status: 409 });
    }
    const before = await getInvoiceSequenceInfo(companyId);
    await prisma.company.update({ where: { id: companyId }, data: { nextInvoiceNumber: value } });
    await prisma.auditLog.create({
      data: {
        companyId, userId, action: "invoice_sequence_change", entity: "Company", entityId: companyId,
        summary: `Invoice sequence changed: ${before.nextNumber} → ${formatted} (Super Admin)`,
      },
    });
    return NextResponse.json({ sequence: await getInvoiceSequenceInfo(companyId) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
