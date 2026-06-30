import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { clientDecisionEmail } from "@/lib/email/messages";
import { APP_URL } from "@/lib/email/templates";
import { z } from "zod";

const DOC_LABEL: Record<string, string> = {
  invoice: "Фактура", proforma: "Проформа фактура", quote: "Оферта",
  credit_note: "Кредитно известие", debit_note: "Дебитно известие",
};

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { decision } = z.object({ decision: z.enum(["accepted", "rejected"]) }).parse(await req.json());

    const doc = await prisma.document.findUnique({
      where: { publicToken: token },
      include: { client: true, company: { select: { name: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true, name: true } } } } } } },
    });
    if (!doc) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    if (doc.clientDecision) return NextResponse.json({ ok: true, already: true });

    await prisma.document.update({ where: { id: doc.id }, data: { clientDecision: decision, clientDecisionAt: new Date() } });

    // известие към фирмата
    const owner = doc.company.companyUsers[0]?.user;
    if (owner?.email) {
      const m = clientDecisionEmail({
        docLabel: DOC_LABEL[doc.type] ?? "Документ", number: doc.number,
        clientName: doc.client?.name ?? doc.clientEmail ?? "Клиент",
        decision, viewUrl: `${APP_URL}/dashboard/documents/${doc.id}`,
      });
      await sendEmail({ to: owner.email, toName: owner.name, subject: m.subject, html: m.html, category: m.category, type: "client_decision", companyId: doc.companyId });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка" }, { status: 500 });
  }
}
