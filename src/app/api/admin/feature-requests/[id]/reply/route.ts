import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { sendEmail } from "@/lib/email/send";
import { featureRequestReplyEmail } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(6000) });

// Отговор до клиента (редактируем текст) (§11). Логва се като бележка + audit.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string; try { const { userId: u } = await requireSuperAdmin(); userId = u; } catch { return NextResponse.json({ error: "Няма достъп." }, { status: 403 }); }
  try {
    const { id } = await params;
    const r = await prisma.featureRequest.findUnique({ where: { id }, select: { id: true, companyId: true, title: true, contactEmail: true, locale: true } });
    if (!r) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const em = featureRequestReplyEmail(r.title, d.body.trim(), normalizeLocale(r.locale));
    await sendEmail({ to: r.contactEmail, subject: em.subject, html: em.html, category: em.category, type: "feature_request_reply", companyId: r.companyId });
    await prisma.$transaction(async (tx) => {
      await tx.featureRequestNote.create({ data: { requestId: id, authorId: userId, kind: "client_email", body: d.body.trim() } });
      await tx.featureRequest.update({ where: { id }, data: { lastActivityAt: new Date() } });
    });
    await audit(r.companyId, userId, "update", "FeatureRequest", id, "Изпратен отговор до клиента");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
