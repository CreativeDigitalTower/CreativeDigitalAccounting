import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { validateEik } from "@/lib/validation/eik";
import { prepareClientEmails } from "@/lib/clientEmails";
import { z } from "zod";

const emailInputSchema = z.object({
  id: z.string().optional(),
  email: z.string(),
  contactName: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  receivesInvoices: z.boolean().optional(),
  receivesReminders: z.boolean().optional(),
  receivesOffers: z.boolean().optional(),
  receivesGeneral: z.boolean().optional(),
});

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
  emails: z.array(emailInputSchema).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const data = schema.parse(await req.json());

    // Валидация на ЕИК/БУЛСТАT (ако е попълнен)
    if (data.eik && data.eik.trim() !== "") {
      const c = validateEik(data.eik);
      if (!c.isValid) return NextResponse.json({ error: c.error ?? "Невалиден ЕИК/БУЛСТАТ." }, { status: 400 });
      data.eik = c.normalized;
    }

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    const { birthday, clientSince, emails: emailsInput, ...rest } = data;

    // Синхронизираме структурираните имейли само ако са подадени (обратна съвместимост).
    let prepared: ReturnType<typeof prepareClientEmails> | null = null;
    if (emailsInput !== undefined) {
      try { prepared = prepareClientEmails(emailsInput); }
      catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
    }

    const client = await prisma.$transaction(async (tx) => {
      if (prepared) {
        // delete-all + recreate: малък набор, каскадно; пази точно един primary.
        await tx.clientEmail.deleteMany({ where: { clientId: id } });
        if (prepared.emails.length) {
          await tx.clientEmail.createMany({
            data: prepared.emails.map(({ id: _id, ...e }) => ({ clientId: id, ...e })),
          });
        }
      }
      return tx.client.update({
        where: { id },
        data: {
          ...rest,
          // primary имейлът се синхронизира с contactEmail (обратна съвместимост)
          contactEmail: prepared ? (prepared.primaryEmail ?? null) : (data.contactEmail || null),
          ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
          ...(clientSince !== undefined ? { clientSince: clientSince ? new Date(clientSince) : null } : {}),
        },
      });
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
