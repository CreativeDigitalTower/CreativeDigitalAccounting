import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  status: z.string().optional(),
  stage: z.string().optional(),
  dealValue: z.number().optional().nullable(),
  birthday: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  clientSince: z.string().optional().nullable(),
  openingRevenue: z.number().optional().nullable(),
  monthlyRetainer: z.number().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const data = schema.parse(await req.json());

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    const { birthday, clientSince, ...rest } = data;
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...rest, contactEmail: data.contactEmail || null,
        ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
        ...(clientSince !== undefined ? { clientSince: clientSince ? new Date(clientSince) : null } : {}),
      },
    });
    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }
    // Клиент с издадени документи не се трие (документите трябва да пазят получателя).
    const docCount = await prisma.document.count({ where: { clientId: id } });
    if (docCount > 0) {
      return NextResponse.json({ error: `Клиентът има ${docCount} свързани документа и не може да бъде изтрит. Можете да го маркирате като „Неактивен".` }, { status: 400 });
    }
    // Разкачаме договори/проекти (по избор свързани), после трием (бележки/контакти/задачи/файлове са с каскада).
    await prisma.contract.updateMany({ where: { clientId: id }, data: { clientId: null } });
    await prisma.project.updateMany({ where: { clientId: id }, data: { clientId: null } });
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
