import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sendEmail, type MailAttachment } from "@/lib/email/send";
import {
  paymentReminderDefaults, paymentReminderEmail, type ReminderStatus,
} from "@/lib/email/messages";
import { resolveCompanyReplyToById } from "@/lib/email/replyTo";
import { APP_URL } from "@/lib/email/templates";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";
import { isValidEmail, normalizeEmail } from "@/lib/clientEmails";
import { MAX_EMAIL_ATTACHMENTS_BYTES, formatFileSize } from "@/lib/attachments";
import { recordDocumentEvent, maskEmail } from "@/lib/documentTracking";
import { z } from "zod";

/** Приблизителен суров размер на base64 data URL (в байтове). */
function base64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/** Дали документът вече е платен → напомняне за плащане не се предлага (§6). */
function isPaid(status: string, paidAmount: number, total: number): boolean {
  return status === "paid" || (total > 0 && paidAmount >= total - 0.005);
}

/** Статус за текста на напомнянето от падежа спрямо днес (§6). Никога „просрочено", ако падежът не е минал. */
function reminderStatus(dueDate: Date | null): ReminderStatus {
  if (!dueDate) return "none";
  return dueDate.getTime() < Date.now() ? "overdue" : "upcoming";
}

/** Общ контекст за preview (GET) и send (POST) — една business логика. */
async function loadContext(id: string, companyId: string) {
  const doc = await prisma.document.findUnique({
    where: { id }, include: { lines: true, client: true, company: { select: { name: true } } },
  });
  if (!doc || doc.companyId !== companyId) return null;

  const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
  const docLoc = normalizeLocale(doc.language);
  const totalFmt = new Intl.NumberFormat(intlLocale(docLoc), { style: "currency", currency: doc.currency || "EUR" }).format(total);
  const dueFmt = doc.dueDate ? doc.dueDate.toLocaleDateString(intlLocale(docLoc)) : null;
  const status = reminderStatus(doc.dueDate);
  const defaults = paymentReminderDefaults({
    clientName: doc.client?.name, number: doc.number, total: totalFmt,
    dueDate: dueFmt, status, company: doc.company.name, locale: docLoc,
  });
  return { doc, total, docLoc, totalFmt, dueFmt, status, defaults };
}

// ── GET: връща default стойностите за модала „Напомняне за плащане" (preview). НЕ изпраща. ──
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const ctx = await loadContext(id, companyId);
    if (!ctx) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });

    const { doc, defaults, totalFmt, dueFmt } = ctx;
    const recipient = (doc.clientEmail || doc.client?.contactEmail || "").trim();
    const paid = isPaid(doc.status, doc.paidAmount, ctx.total);
    const replyTo = await resolveCompanyReplyToById(companyId);

    return NextResponse.json({
      recipient: isValidEmail(recipient) ? recipient : "",
      subject: defaults.subject,
      message: defaults.message,
      attachPdf: true,
      replyTo,
      total: totalFmt,
      dueDate: dueFmt,
      number: doc.number,
      paid,
      canRemind: !paid,
    });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}

const schema = z.object({
  email: z.string().min(1),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(10000),
  attachPdf: z.boolean().optional(),
  invoicePdf: z.object({ name: z.string(), dataUrl: z.string() }).nullable().optional(),
});

// ── POST: изпраща ръчното напомняне за плащане с редактираните поля (§10/§11). ──
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const body = schema.parse(await req.json());

    const ctx = await loadContext(id, companyId);
    if (!ctx) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const { doc, totalFmt, dueFmt } = ctx;

    // §6: платен документ → напомняне не се изпраща.
    if (isPaid(doc.status, doc.paidAmount, ctx.total)) {
      return NextResponse.json({ error: "Документът е платен — напомняне не е нужно." }, { status: 400 });
    }

    const to = normalizeEmail(body.email);
    if (!isValidEmail(to)) return NextResponse.json({ error: "Няма валиден имейл на получателя." }, { status: 400 });

    const token = doc.publicToken ?? crypto.randomBytes(24).toString("hex");
    if (!doc.publicToken) await prisma.document.update({ where: { id }, data: { publicToken: token } });

    // ── PDF на фактурата (по избор): генерира се клиентски и се подава тук; без дублиране на логика. ──
    const attachments: MailAttachment[] = [];
    const attMeta: { filename: string; size: number }[] = [];
    if (body.attachPdf && body.invoicePdf?.dataUrl) {
      const size = base64Bytes(body.invoicePdf.dataUrl);
      if (size > MAX_EMAIL_ATTACHMENTS_BYTES) {
        return NextResponse.json({
          error: `Размерът на PDF-а (${formatFileSize(size)}) надвишава лимита за имейл (${formatFileSize(MAX_EMAIL_ATTACHMENTS_BYTES)}).`,
          code: "ATTACHMENTS_TOO_LARGE",
        }, { status: 413 });
      }
      attachments.push({ filename: body.invoicePdf.name, dataUrl: body.invoicePdf.dataUrl });
      attMeta.push({ filename: body.invoicePdf.name, size });
    }

    const m = paymentReminderEmail({
      company: doc.company.name, number: doc.number, total: totalFmt, dueDate: dueFmt,
      subject: body.subject, message: body.message, viewUrl: `${APP_URL}/d/${token}`, locale: ctx.docLoc,
    });

    // §12: Reply-To сочи към фирмата издател; From остава CDA.
    const replyTo = await resolveCompanyReplyToById(companyId);
    const r = await sendEmail({
      to, toName: doc.client?.name, subject: m.subject, html: m.html, category: m.category,
      type: "invoice_reminder", companyId, documentId: id, replyTo,
      attachments: attachments.length ? attachments : undefined,
      attachmentsMeta: attMeta.length ? attMeta : null,
    });
    await recordDocumentEvent(id, r.status === "failed" ? "failed" : "reminder_sent", { companyId, channel: "email", recipient: maskEmail(to) });

    return NextResponse.json({ ok: true, status: r.status, url: `${APP_URL}/d/${token}` });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
