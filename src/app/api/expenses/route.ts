import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string(),
  supplierId: z.string().nullable().optional(),
  description: z.string().min(1),
  invoiceNumber: z.string().optional().nullable(),
  amount: z.number().positive(),
  vatAmount: z.number().min(0),
  date: z.string(),
  source: z.enum(["manual", "incoming_invoice"]).default("manual"),
  attachmentUrl: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const body = await req.json();
    const data = schema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        companyId,
        categoryId: data.categoryId,
        supplierId: data.supplierId ?? null,
        description: data.description,
        invoiceNumber: data.invoiceNumber ?? null,
        amount: data.amount,
        vatAmount: data.vatAmount,
        date: new Date(data.date),
        source: data.source,
        attachmentUrl: data.attachmentUrl ?? null,
      },
    });
    return NextResponse.json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      include: { category: true, supplier: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}
