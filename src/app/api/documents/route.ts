import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import {
  generateDocumentNumber,
  checkInvoiceLimit,
  incrementInvoiceCounter,
} from "@/lib/documents";
import { z } from "zod";

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
});

const schema = z.object({
  type: z.enum(["invoice", "proforma", "quote", "credit_note", "debit_note"]),
  clientId: z.string().nullable().optional(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
  status: z.enum(["draft", "sent"]).default("draft"),
  parentDocumentId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const body = await req.json();
    const data = schema.parse(body);

    if (data.type === "invoice" && data.status === "sent") {
      const allowed = await checkInvoiceLimit(companyId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Достигнат лимит от 5 фактури/месец. Надградете плана си." },
          { status: 403 }
        );
      }
    }

    const number = await generateDocumentNumber(companyId, data.type);

    const document = await prisma.document.create({
      data: {
        companyId,
        type: data.type,
        number,
        clientId: data.clientId ?? null,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
        status: data.status,
        parentDocumentId: data.parentDocumentId ?? null,
        lines: {
          create: data.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            lineTotal: l.quantity * l.unitPrice * (1 + l.vatRate / 100),
          })),
        },
      },
      include: { lines: true },
    });

    if (data.type === "invoice" && data.status === "sent") {
      await incrementInvoiceCounter(companyId);
    }

    return NextResponse.json(document);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни.", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const docs = await prisma.document.findMany({
      where: { companyId },
      include: { client: true, lines: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}
