import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, getMyRole } from "@/lib/session";
import { audit } from "@/lib/documents";
import { validateAssetUpload, normalizeDocType, normalizeReminderDays, canAssetDoc } from "@/lib/assetDocuments";
import { MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { z } from "zod";

const listSelect = {
  id: true, docType: true, name: true, description: true, docDate: true, number: true,
  issuer: true, validFrom: true, validTo: true, note: true, data: true,
  reminderDays: true, reminderSentAt: true, filename: true, originalFilename: true,
  mimeType: true, size: true, linkedDocumentId: true, uploadedById: true, createdAt: true, updatedAt: true,
} as const;

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const patchSchema = z.object({
  docType: z.string().nullable().optional(),
  name: z.string().max(300).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  docDate: optDate,
  number: z.string().max(120).nullable().optional(),
  issuer: z.string().max(300).nullable().optional(),
  validFrom: optDate,
  validTo: optDate,
  note: z.string().max(5000).nullable().optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  reminderDays: z.number().int().nullable().optional(),
  // Замяна на файла (по желание) — само за собствен файл, не за връзка.
  replaceFile: z.object({
    originalFilename: z.string().min(1).max(300),
    mimeType: z.string().min(1),
    size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Файлът е твърде голям (макс. 5 MB)."),
    dataUrl: z.string().min(1),
  }).optional(),
});

async function loadDoc(companyId: string, assetId: string, docId: string) {
  const doc = await prisma.assetDocument.findFirst({
    where: { id: docId, assetId, deletedAt: null, asset: { companyId } },
    select: { id: true, linkedDocumentId: true },
  });
  return doc;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const role = await getMyRole(userId, companyId);
    if (!canAssetDoc(role, "edit")) return NextResponse.json({ error: "Нямате право да редактирате документи." }, { status: 403 });
    const { id, docId } = await params;
    const existing = await loadDoc(companyId, id, docId);
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

    const d = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = { updatedById: userId };
    if (d.docType !== undefined) data.docType = normalizeDocType(d.docType);
    if (d.name !== undefined) data.name = d.name;
    if (d.description !== undefined) data.description = d.description;
    if (d.docDate !== undefined) data.docDate = d.docDate ? new Date(d.docDate) : null;
    if (d.number !== undefined) data.number = d.number;
    if (d.issuer !== undefined) data.issuer = d.issuer;
    if (d.validFrom !== undefined) data.validFrom = d.validFrom ? new Date(d.validFrom) : null;
    if (d.validTo !== undefined) {
      data.validTo = d.validTo ? new Date(d.validTo) : null;
      data.reminderSentAt = null; // нова крайна дата → рестартирай напомнянето
    }
    if (d.note !== undefined) data.note = d.note;
    if (d.data !== undefined) data.data = (d.data ?? undefined) as object | undefined;
    if (d.reminderDays !== undefined) { data.reminderDays = normalizeReminderDays(d.reminderDays); data.reminderSentAt = null; }

    let replaced = false;
    if (d.replaceFile) {
      if (existing.linkedDocumentId) return NextResponse.json({ error: "Свързан документ не може да се заменя с файл." }, { status: 400 });
      const v = validateAssetUpload(d.replaceFile);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      data.filename = d.replaceFile.originalFilename;
      data.originalFilename = d.replaceFile.originalFilename;
      data.mimeType = d.replaceFile.mimeType;
      data.size = d.replaceFile.size;
      data.dataUrl = d.replaceFile.dataUrl;
      replaced = true;
    }

    const doc = await prisma.assetDocument.update({ where: { id: docId }, data, select: listSelect });
    await audit(companyId, userId, replaced ? "replace" : "update", "AssetDocument", docId,
      `${replaced ? "Замяна на файл" : "Редакция на метаданни"} — актив ${id}`);
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const role = await getMyRole(userId, companyId);
    if (!canAssetDoc(role, "delete")) return NextResponse.json({ error: "Нямате право да изтривате документи." }, { status: 403 });
    const { id, docId } = await params;
    const existing = await loadDoc(companyId, id, docId);
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    // Soft delete (Кошче) — файлът не се трие окончателно веднага.
    await prisma.assetDocument.update({ where: { id: docId }, data: { deletedAt: new Date() } });
    await audit(companyId, userId, "delete", "AssetDocument", docId, `Изтрит документ към актив ${id}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
