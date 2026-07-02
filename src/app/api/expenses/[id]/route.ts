import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

const schema = z.object({
  attachmentUrl: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  invoiceNumber: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  vatAmount: z.number().min(0).optional(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.expense.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const d = schema.parse(await req.json());
    if (d.attachmentUrl) {
      const v = validateUpload({ dataUrl: d.attachmentUrl });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(d.attachmentUrl !== undefined ? { attachmentUrl: d.attachmentUrl } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.invoiceNumber !== undefined ? { invoiceNumber: d.invoiceNumber } : {}),
        ...(d.amount !== undefined ? { amount: d.amount } : {}),
        ...(d.vatAmount !== undefined ? { vatAmount: d.vatAmount } : {}),
        ...(d.date !== undefined ? { date: new Date(d.date) } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.supplierId !== undefined ? { supplierId: d.supplierId } : {}),
        ...(d.isRecurring !== undefined ? { isRecurring: d.isRecurring } : {}),
      },
    });
    return NextResponse.json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.expense.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
