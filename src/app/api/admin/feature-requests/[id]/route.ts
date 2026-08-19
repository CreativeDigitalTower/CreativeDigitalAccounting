import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/documents";
import { sendEmail } from "@/lib/email/send";
import { featureRequestDeliveredEmail } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import { REQUEST_STATUSES, REQUEST_PRIORITIES, notifiesClient } from "@/lib/featureRequest/config";
import { z } from "zod";

async function admin() { const { userId } = await requireSuperAdmin(); return userId; }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string; try { uid = await admin(); } catch { return NextResponse.json({ error: "Няма достъп." }, { status: 403 }); }
  void uid;
  const { id } = await params;
  const r = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, eik: true, phone: true, businessSector: true } },
      attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  return NextResponse.json(r);
}

const schema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string; try { userId = await admin(); } catch { return NextResponse.json({ error: "Няма достъп." }, { status: 403 }); }
  try {
    const { id } = await params;
    const existing = await prisma.featureRequest.findUnique({ where: { id }, select: { id: true, status: true, companyId: true, title: true, contactEmail: true, locale: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = { ...d, lastActivityAt: new Date() };
    if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;
    const changingStatus = d.status && d.status !== existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.featureRequest.update({ where: { id }, data });
      if (changingStatus) await tx.featureRequestNote.create({ data: { requestId: id, authorId: userId, kind: "status", body: `Статус → ${d.status}` } });
    });
    if (d.status) await audit(existing.companyId, userId, "status_change", "FeatureRequest", id, `${existing.status} → ${d.status}`);
    else await audit(existing.companyId, userId, "update", "FeatureRequest", id, "Редакция на заявка");

    // Известие към клиента при „Реализирана" (§20).
    if (changingStatus && d.status && notifiesClient(d.status)) {
      const loc = normalizeLocale(existing.locale);
      const em = featureRequestDeliveredEmail(existing.title, loc);
      try {
        await sendEmail({ to: existing.contactEmail, subject: em.subject, html: em.html, category: em.category, type: "feature_request_delivered", companyId: existing.companyId });
        await prisma.notification.create({ data: { companyId: existing.companyId, type: "system", title: "Заявката Ви е реализирана", body: existing.title, link: "/dashboard/feature-request" } });
      } catch { /* ignore */ }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
