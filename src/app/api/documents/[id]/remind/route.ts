import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sendEmail } from "@/lib/email/send";
import { invoiceToClientEmail } from "@/lib/email/messages";
import { APP_URL } from "@/lib/email/templates";
import { normalizeLocale, intlLocale } from "@/lib/i18n/config";
import { isValidEmail } from "@/lib/clientEmails";
import { recordDocumentEvent, maskEmail } from "@/lib/documentTracking";
import { z } from "zod";

const schema = z.object({ email: z.string().optional() });

// Повторно изпращане / напомняне: изпраща отново имейла с ЛИНК към документа
// (без прикачен PDF — той се генерира клиентски). Записва „reminder_sent".
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const body = schema.parse(await req.json().catch(() => ({})));

    const doc = await prisma.document.findUnique({
      where: { id }, include: { lines: true, client: true, company: { select: { name: true } } },
    });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });

    const to = (body.email || doc.clientEmail || doc.client?.contactEmail || "").trim();
    if (!isValidEmail(to)) return NextResponse.json({ error: "Няма валиден имейл на получателя." }, { status: 400 });

    const token = doc.publicToken ?? crypto.randomBytes(24).toString("hex");
    if (!doc.publicToken) await prisma.document.update({ where: { id }, data: { publicToken: token } });

    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
    const docLoc = normalizeLocale(doc.language);
    const m = invoiceToClientEmail({
      fromCompany: doc.company.name, docType: doc.type, number: doc.number,
      total: new Intl.NumberFormat(intlLocale(docLoc), { style: "currency", currency: doc.currency || "EUR" }).format(total),
      viewUrl: `${APP_URL}/d/${token}`, clientName: doc.client?.name, locale: docLoc,
    });
    const r = await sendEmail({
      to, toName: doc.client?.name, subject: m.subject, html: m.html, category: m.category,
      type: "invoice_reminder", companyId, documentId: id,
    });
    await recordDocumentEvent(id, r.status === "failed" ? "failed" : "reminder_sent", { companyId, channel: "email", recipient: maskEmail(to) });

    return NextResponse.json({ ok: true, status: r.status, url: `${APP_URL}/d/${token}` });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
