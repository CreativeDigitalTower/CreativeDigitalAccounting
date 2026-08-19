import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { sendEmail, notifyAdmin } from "@/lib/email/send";
import { featureRequestConfirmationEmail, adminFeatureRequestEmail } from "@/lib/email/messages";
import { normalizeLocale } from "@/lib/i18n/config";
import {
  REQUEST_TYPES, REQUEST_SCOPES, validateAttachment, MAX_ATTACHMENTS, MAX_TITLE_LEN, MAX_DESC_LEN,
  RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, DEDUP_WINDOW_MS,
} from "@/lib/featureRequest/config";
import { z } from "zod";

// Списък със СОБСТВЕНИТЕ заявки на клиента (§13). Без вътрешни бележки.
export async function GET() {
  const { companyId } = await requireCompany();
  const rows = await prisma.featureRequest.findMany({
    where: { companyId },
    select: { id: true, type: true, title: true, status: true, createdAt: true, lastActivityAt: true },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return NextResponse.json(rows);
}

const attSchema = z.object({ fileName: z.string().max(255), mimeType: z.string().max(120), size: z.number().int().min(0), dataUrl: z.string() });
const schema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: z.string().min(2).max(MAX_TITLE_LEN),
  description: z.string().min(5).max(MAX_DESC_LEN),
  benefit: z.string().max(MAX_DESC_LEN).nullable().optional(),
  contactEmail: z.string().email().max(160),
  contactPhone: z.string().max(40).nullable().optional(),
  scope: z.enum(REQUEST_SCOPES).optional(),
  attachments: z.array(attSchema).max(MAX_ATTACHMENTS).optional(),
});

export async function POST(req: Request) {
  const { userId, companyId } = await requireCompany();
  try {
    const d = schema.parse(await req.json());

    // Anti-spam: rate limit + дедупликация (§21).
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await prisma.featureRequest.count({ where: { companyId, createdAt: { gte: since } } });
    if (recentCount >= RATE_LIMIT_MAX) return NextResponse.json({ error: "Твърде много заявки. Опитайте по-късно." }, { status: 429 });
    const dupSince = new Date(Date.now() - DEDUP_WINDOW_MS);
    const dup = await prisma.featureRequest.findFirst({ where: { companyId, title: d.title.trim(), createdAt: { gte: dupSince } }, select: { id: true } });
    if (dup) return NextResponse.json({ error: "Вече изпратихте същата заявка.", duplicate: true }, { status: 409 });

    // Валидация на прикачените файлове (§19).
    for (const a of d.attachments ?? []) {
      const err = validateAttachment(a.mimeType, a.size);
      if (err) return NextResponse.json({ error: err === "type" ? "Неразрешен тип файл." : "Файлът е твърде голям." }, { status: 400 });
    }

    // Snapshot: план + активни модули + локал (§6).
    const [company, user, modules] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, eik: true, defaultLanguage: true, subscription: { select: { plan: true } } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { preferredLanguage: true } }),
      prisma.companyModuleAccess.findMany({ where: { companyId, enabled: true }, select: { moduleKey: true } }),
    ]);
    const locale = normalizeLocale(user?.preferredLanguage ?? company?.defaultLanguage ?? "bg");
    const plan = company?.subscription?.plan ?? "free";

    const request = await prisma.featureRequest.create({
      data: {
        companyId, userId, scope: d.scope ?? "company", type: d.type, title: d.title.trim(), description: d.description.trim(),
        benefit: d.benefit?.trim() || null, contactEmail: d.contactEmail.trim().toLowerCase(), contactPhone: d.contactPhone?.trim() || null,
        status: "new", planSnapshot: plan, modulesSnapshot: modules.map((m) => m.moduleKey).join(","), locale,
        attachments: d.attachments?.length ? { create: d.attachments.map((a) => ({ fileName: a.fileName.slice(0, 255), mimeType: a.mimeType, size: a.size, dataUrl: a.dataUrl })) } : undefined,
        notes: { create: { authorId: userId, kind: "status", body: "Заявката е създадена." } },
      },
      select: { id: true, title: true },
    });

    await audit(companyId, userId, "create", "FeatureRequest", request.id, `Индивидуална заявка: ${request.title}`);

    // Confirmation към клиента + известие към Super Admin (не блокира отговора при грешка).
    try {
      const conf = featureRequestConfirmationEmail(request.title, locale);
      await sendEmail({ to: d.contactEmail, subject: conf.subject, html: conf.html, category: conf.category, type: "feature_request_confirmation", companyId });
      const adm = adminFeatureRequestEmail({ company: company?.name ?? "—", eik: company?.eik, type: d.type, title: request.title, contactEmail: d.contactEmail, plan });
      await notifyAdmin(adm.subject, adm.html, "feature_request_new");
    } catch { /* email грешките не спират заявката */ }

    return NextResponse.json({ id: request.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
