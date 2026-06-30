import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sendEmail } from "@/lib/email/send";
import { invoiceToClientEmail } from "@/lib/email/messages";
import { APP_URL } from "@/lib/email/templates";
import { z } from "zod";

const DOC_LABEL: Record<string, string> = {
  invoice: "Фактура", proforma: "Проформа фактура", quote: "Оферта",
  credit_note: "Кредитно известие", debit_note: "Дебитно известие",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());

    const doc = await prisma.document.findUnique({
      where: { id }, include: { lines: true, client: true, company: { select: { name: true } } },
    });
    if (!doc || doc.companyId !== companyId) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });

    const token = doc.publicToken ?? crypto.randomBytes(24).toString("hex");
    await prisma.document.update({
      where: { id }, data: { publicToken: token, clientEmail: email, sentToClientAt: new Date() },
    });

    const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
    const m = invoiceToClientEmail({
      fromCompany: doc.company.name,
      docLabel: DOC_LABEL[doc.type] ?? "Документ",
      number: doc.number,
      total: new Intl.NumberFormat("bg-BG", { style: "currency", currency: doc.currency || "EUR" }).format(total),
      viewUrl: `${APP_URL}/d/${token}`,
      clientName: doc.client?.name,
    });
    await sendEmail({ to: email, toName: doc.client?.name, subject: m.subject, html: m.html, category: m.category, type: "invoice_to_client", companyId });

    return NextResponse.json({ ok: true, url: `${APP_URL}/d/${token}` });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалиден имейл" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
