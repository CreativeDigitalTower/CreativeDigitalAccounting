import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireCompany, getMyRole, isSuperAdmin } from "@/lib/session";
import { getInvoiceSequenceInfo, isNumberTaken } from "@/lib/documents";
import { coreValue, formatInvoiceNumber } from "@/lib/invoiceNumbering";
import { z } from "zod";

// Управление на номерацията на фактурите за АКТИВНАТА фирма (§10-§13). Строго company-scoped.
export async function GET() {
  const { companyId } = await requireCompany();
  return NextResponse.json(await getInvoiceSequenceInfo(companyId));
}

const schema = z.object({ nextNumber: z.string().min(1).max(40) });

// Задаване на нов „следващ номер" — само Owner/Manager или Super Admin (§13). Валидира се
// формат + уникалност (§17); записва се одит с ясно означение при Super Admin (§23).
export async function PATCH(req: Request) {
  const { companyId, userId } = await requireCompany();
  const [role, admin] = await Promise.all([getMyRole(userId, companyId), isSuperAdmin(userId)]);
  if (!admin && !(role && ["owner", "manager"].includes(role))) {
    return NextResponse.json({ error: "Нямате права да променяте номерацията." }, { status: 403 });
  }
  try {
    const { nextNumber } = schema.parse(await req.json());
    const value = coreValue(nextNumber.trim());
    if (value == null || value < 1) {
      return NextResponse.json({ error: "Въведете валиден номер (само цифри), напр. 0002700200." }, { status: 400 });
    }
    const formatted = formatInvoiceNumber(value, 10);
    if (await isNumberTaken(companyId, formatted)) {
      return NextResponse.json({ error: `Фактура № ${formatted} вече съществува.` }, { status: 409 });
    }
    const before = await getInvoiceSequenceInfo(companyId);
    await prisma.company.update({ where: { id: companyId }, data: { nextInvoiceNumber: value } });

    const impersonating = !!(await cookies()).get("cda_impersonate")?.value;
    await prisma.auditLog.create({
      data: {
        companyId, userId, action: "invoice_sequence_change", entity: "Company", entityId: companyId,
        summary: `Invoice sequence changed: ${before.nextNumber} → ${formatted}${admin ? " (Super Admin)" : ""}${impersonating ? " [impersonation]" : ""}`,
      },
    });
    return NextResponse.json(await getInvoiceSequenceInfo(companyId));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
