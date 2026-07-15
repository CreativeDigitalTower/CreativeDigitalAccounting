import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sendEmail, type MailAttachment } from "@/lib/email/send";
import { invoiceToClientEmail } from "@/lib/email/messages";
import { APP_URL } from "@/lib/email/templates";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";
import { dedupeRecipients, isValidEmail } from "@/lib/clientEmails";
import { MAX_EMAIL_ATTACHMENTS_BYTES, formatFileSize } from "@/lib/attachments";
import { z } from "zod";

const schema = z.object({
  // Нов формат: няколко получателя + избрани приложения
  recipients: z.array(z.string()).optional(),
  attachmentIds: z.array(z.string()).optional(),
  includeInvoicePdf: z.boolean().optional(),
  invoicePdf: z.object({ name: z.string(), dataUrl: z.string() }).nullable().optional(),
  // Обратна съвместимост: единичен адрес
  email: z.string().optional(),
});

/** Приблизителен суров размер на base64 data URL (в байтове). */
function base64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const body = schema.parse(await req.json());

    const doc = await prisma.document.findUnique({
      where: { id }, include: { lines: true, client: true, company: { select: { name: true } } },
    });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });

    // ── Получатели: обединяваме новия списък + евентуален единичен email, нормализираме, махаме дубли ──
    const rawRecipients = [...(body.recipients ?? []), ...(body.email ? [body.email] : [])];
    const recipients = dedupeRecipients(rawRecipients);
    if (recipients.length === 0) return NextResponse.json({ error: "Няма избрани получатели." }, { status: 400 });
    const invalid = recipients.filter((e) => !isValidEmail(e));
    if (invalid.length) return NextResponse.json({ error: `Невалиден имейл: ${invalid[0]}` }, { status: 400 });

    // ── Приложения: винаги фактурата (ако е подадена) + избраните съхранени PDF-и ──
    const attachments: MailAttachment[] = [];
    const attMeta: { filename: string; size: number }[] = [];
    let totalBytes = 0;

    if (body.includeInvoicePdf !== false && body.invoicePdf?.dataUrl) {
      const size = base64Bytes(body.invoicePdf.dataUrl);
      attachments.push({ filename: body.invoicePdf.name, dataUrl: body.invoicePdf.dataUrl });
      attMeta.push({ filename: body.invoicePdf.name, size });
      totalBytes += size;
    }

    if (body.attachmentIds?.length) {
      const files = await prisma.documentAttachment.findMany({
        where: { id: { in: body.attachmentIds }, documentId: id, document: { companyId } },
      });
      for (const f of files) {
        attachments.push({ filename: f.filename, dataUrl: f.dataUrl });
        attMeta.push({ filename: f.filename, size: f.size });
        totalBytes += f.size;
      }
    }

    // ── Лимит за размер: ясно съобщение + предложение за защитен линк ──
    if (totalBytes > MAX_EMAIL_ATTACHMENTS_BYTES) {
      return NextResponse.json({
        error: `Общият размер на приложенията (${formatFileSize(totalBytes)}) надвишава лимита за имейл (${formatFileSize(MAX_EMAIL_ATTACHMENTS_BYTES)}). Премахнете някои файлове или ги споделете чрез защитения линк към документа.`,
        code: "ATTACHMENTS_TOO_LARGE",
        totalBytes,
      }, { status: 413 });
    }

    // ── Токен за защитен преглед в портала (линкът остава в тялото на имейла) ──
    const token = doc.publicToken ?? crypto.randomBytes(24).toString("hex");
    await prisma.document.update({
      where: { id }, data: { publicToken: token, clientEmail: recipients[0], sentToClientAt: new Date() },
    });

    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
    const docLoc = normalizeLocale(doc.language);
    const m = invoiceToClientEmail({
      fromCompany: doc.company.name,
      docType: doc.type,
      number: doc.number,
      total: new Intl.NumberFormat(intlLocale(docLoc), { style: "currency", currency: doc.currency || "EUR" }).format(total),
      viewUrl: `${APP_URL}/d/${token}`,
      clientName: doc.client?.name,
      locale: docLoc,
    });

    // ── Изпращаме поотделно към всеки получател (per-recipient log; blacklist на един
    //    адрес не блокира останалите). Записваме documentId + метаданни за приложенията. ──
    const results: { email: string; status: string }[] = [];
    for (const to of recipients) {
      const r = await sendEmail({
        to, toName: doc.client?.name, subject: m.subject, html: m.html, category: m.category,
        type: "invoice_to_client", companyId, attachments,
        documentId: id, attachmentsMeta: attMeta.length ? attMeta : null,
      });
      results.push({ email: to, status: r.status });
    }

    return NextResponse.json({
      ok: true, url: `${APP_URL}/d/${token}`,
      recipients, results, attachments: attMeta, totalBytes,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
