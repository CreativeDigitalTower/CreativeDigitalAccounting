import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import {
  generateDocumentNumber,
  checkInvoiceLimit,
  incrementInvoiceCounter,
  isNumberTaken,
  audit,
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
  number: z.string().optional(), // ръчно зададен номер (ако липсва — автоматичен)
  clientId: z.string().nullable().optional(),
  issueDate: z.string(),
  taxEventDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  language: z.string().default("bg"),
  template: z.string().optional(),
  paymentMethod: z.string().default("bank_transfer"),
  notes: z.string().optional(),
  internalComment: z.string().optional(),
  lines: z.array(lineSchema).min(1),
  status: z.enum(["draft", "issued", "sent"]).default("draft"),
  parentDocumentId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const body = await req.json();
    const data = schema.parse(body);
    const issued = data.status === "issued" || data.status === "sent";

    // Всеки официално издаден изходящ документ се брои към месечния лимит
    if (issued) {
      const allowed = await checkInvoiceLimit(companyId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Достигнат месечен лимит за документи за вашия план. Надградете плана си, за да издавате повече." },
          { status: 403 }
        );
      }
    }

    // Ръчно зададен номер или автоматичен; проверка за дублиране
    let number = data.number?.trim();
    if (number) {
      if (await isNumberTaken(companyId, number)) {
        return NextResponse.json({ error: "Този номер вече е използван." }, { status: 400 });
      }
    } else {
      number = await generateDocumentNumber(companyId, data.type);
    }

    // Шаблон по подразбиране от фирмения профил, ако не е зададен
    let template = data.template;
    if (!template) {
      const comp = await prisma.company.findUnique({ where: { id: companyId }, select: { invoiceTemplate: true } });
      template = comp?.invoiceTemplate ?? "classic";
    }

    const document = await prisma.document.create({
      data: {
        companyId,
        type: data.type,
        number,
        clientId: data.clientId ?? null,
        issueDate: new Date(data.issueDate),
        taxEventDate: data.taxEventDate ? new Date(data.taxEventDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        currency: data.currency,
        language: data.language,
        template,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        internalComment: data.internalComment,
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

    if (issued) {
      await incrementInvoiceCounter(companyId);
    }

    // Автоматично намаляване на склада при фактуриране (Бизнес + Про).
    // Намира артикул по точно име на реда и изписва по метод FIFO (най-старата партида първа).
    let stockNote: string | null = null;
    if (data.type === "invoice" && issued) {
      const plan = await getPlan(companyId);
      if (planHasFeature(plan, "production")) {
        const adjusted: string[] = [];
        for (const line of data.lines) {
          const item = await prisma.stockItem.findFirst({
            where: { companyId, name: { equals: line.description.trim(), mode: "insensitive" } },
          });
          if (!item) continue;
          const qty = line.quantity;
          await prisma.stockMovement.create({
            data: { stockItemId: item.id, type: "sale", quantity: -qty, date: new Date(data.issueDate), note: `Продажба по фактура ${number}` },
          });
          await prisma.stockItem.update({ where: { id: item.id }, data: { quantity: { decrement: qty } } });
          // FIFO консумация по партиди
          let remaining = qty;
          const batches = await prisma.stockBatch.findMany({ where: { stockItemId: item.id, quantity: { gt: 0 } }, orderBy: { createdAt: "asc" } });
          for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(b.quantity, remaining);
            await prisma.stockBatch.update({ where: { id: b.id }, data: { quantity: { decrement: take } } });
            remaining -= take;
          }
          adjusted.push(item.name);
        }
        if (adjusted.length) stockNote = `Намалена наличност: ${adjusted.join(", ")}`;
      }
    }

    await audit(companyId, userId, "create", "Document", document.id, `${data.type} ${number}${stockNote ? ` · ${stockNote}` : ""}`);

    return NextResponse.json({ ...document, stockNote });
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
