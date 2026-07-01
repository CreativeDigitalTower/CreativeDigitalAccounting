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

    // ─── #4 Обмен между регистрирани фирми ───
    // Ако документът е към клиент, чийто ЕИК съвпада с регистрирана фирма,
    // и подателят споделя през платформата → връзваме документа и известяваме получателя.
    let sharedWith: string | null = null;
    try {
      const sender = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, shareDocsInternally: true } });
      if (sender?.shareDocsInternally && data.clientId) {
        const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId }, select: { eik: true } });
        const eik = client?.eik?.trim();
        if (eik) {
          const recipient = await prisma.company.findFirst({ where: { eik, id: { not: companyId } }, select: { id: true, name: true } });
          if (recipient) {
            await prisma.document.update({ where: { id: document.id }, data: { recipientCompanyId: recipient.id } });
            const DOC_LABEL: Record<string, string> = { invoice: "фактура", proforma: "проформа", quote: "оферта", credit_note: "кредитно известие", debit_note: "дебитно известие" };
            await prisma.notification.create({
              data: {
                companyId: recipient.id, type: "incoming_document",
                title: `Нов входящ документ от ${sender.name}`,
                body: `${sender.name} Ви издаде ${DOC_LABEL[data.type] ?? "документ"} № ${number}.`,
                link: `/dashboard/inbox/${document.id}`,
              },
            });
            sharedWith = recipient.name;
          }
        }
      }
    } catch (e) { console.error("inter-company share", e); }

    await audit(companyId, userId, "create", "Document", document.id, `${data.type} ${number}${stockNote ? ` · ${stockNote}` : ""}${sharedWith ? ` · споделен с ${sharedWith}` : ""}`);

    // ─── Meta: първа издадена фактура ───
    if (data.type === "invoice" && issued) {
      try {
        const invoiceCount = await prisma.document.count({ where: { companyId, type: "invoice" } });
        if (invoiceCount === 1) {
          const { sendMetaEvent, metaContextFromRequest, newEventId } = await import("@/lib/meta");
          const owner = await prisma.companyUser.findFirst({ where: { companyId, role: "owner" }, select: { user: { select: { email: true, name: true } } } });
          const total = document.lines.reduce((s, l) => s + l.lineTotal, 0);
          await sendMetaEvent({
            eventName: "FirstInvoiceCreated", eventId: newEventId(), actionSource: "system_generated",
            user: { email: owner?.user.email, firstName: owner?.user.name?.split(" ")[0], externalId: companyId, ...metaContextFromRequest(req) },
            custom: { company_id: companyId, value: total, currency: data.currency },
          });
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ ...document, stockNote, sharedWith });
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
