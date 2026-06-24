import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit, isNumberTaken } from "@/lib/documents";
import { z } from "zod";

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
});

const schema = z.object({
  number: z.string().optional(),
  clientId: z.string().nullable().optional(),
  issueDate: z.string(),
  taxEventDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  currency: z.string(),
  language: z.string(),
  template: z.string().optional(),
  paymentMethod: z.string(),
  notes: z.string().optional().nullable(),
  internalComment: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const doc = await prisma.document.findUnique({ where: { id }, include: { lines: true, client: true } });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id } = await params;
    const data = schema.parse(await req.json());

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    if (data.number && data.number !== existing.number && (await isNumberTaken(companyId, data.number, id))) {
      return NextResponse.json({ error: "Този номер вече е използван." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.documentLine.deleteMany({ where: { documentId: id } }),
      prisma.document.update({
        where: { id },
        data: {
          number: data.number?.trim() || existing.number,
          clientId: data.clientId ?? null,
          issueDate: new Date(data.issueDate),
          taxEventDate: data.taxEventDate ? new Date(data.taxEventDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          currency: data.currency,
          language: data.language,
          template: data.template ?? existing.template,
          paymentMethod: data.paymentMethod,
          notes: data.notes ?? null,
          internalComment: data.internalComment ?? null,
          lines: {
            create: data.lines.map((l) => ({
              description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
              vatRate: l.vatRate, lineTotal: l.quantity * l.unitPrice * (1 + l.vatRate / 100),
            })),
          },
        },
      }),
    ]);

    await audit(companyId, userId, "update", "Document", id, `Редакция на ${existing.number}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
