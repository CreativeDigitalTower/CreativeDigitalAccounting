import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, getMyRole } from "@/lib/session";
import { audit } from "@/lib/documents";
import { validateAssetUpload, normalizeDocType, normalizeReminderDays, canAssetDoc } from "@/lib/assetDocuments";
import { MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { z } from "zod";

// Публичен select — НИКОГА не връща dataUrl (тежък + излишен за списъка).
const listSelect = {
  id: true, docType: true, name: true, description: true, docDate: true, number: true,
  issuer: true, validFrom: true, validTo: true, note: true, data: true,
  reminderDays: true, reminderSentAt: true, filename: true, originalFilename: true,
  mimeType: true, size: true, linkedDocumentId: true, uploadedById: true, createdAt: true, updatedAt: true,
} as const;

async function ownedAsset(companyId: string, assetId: string) {
  const a = await prisma.asset.findFirst({ where: { id: assetId, companyId }, select: { id: true, name: true } });
  return a;
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const metaSchema = {
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
};

// Или качен файл, или връзка към съществуващ документ (взаимно изключващи се).
const createSchema = z.object({
  ...metaSchema,
  // файл:
  originalFilename: z.string().min(1).max(300).optional(),
  mimeType: z.string().min(1).optional(),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Файлът е твърде голям (макс. 5 MB).").optional(),
  dataUrl: z.string().min(1).optional(),
  // ИЛИ връзка:
  linkedDocumentId: z.string().min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const role = await getMyRole(userId, companyId);
    if (!canAssetDoc(role, "view")) return NextResponse.json([], { status: 200 });
    const { id } = await params;
    if (!(await ownedAsset(companyId, id))) return NextResponse.json([], { status: 200 });
    const docs = await prisma.assetDocument.findMany({
      where: { assetId: id, deletedAt: null },
      select: { ...listSelect, linkedDocument: { select: { id: true, number: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const role = await getMyRole(userId, companyId);
    if (!canAssetDoc(role, "upload")) return NextResponse.json({ error: "Нямате право да качвате документи." }, { status: 403 });
    const { id } = await params;
    if (!(await ownedAsset(companyId, id))) return NextResponse.json({ error: "Активът не е намерен." }, { status: 404 });

    const d = createSchema.parse(await req.json());
    const hasFile = !!d.dataUrl;
    const hasLink = !!d.linkedDocumentId;
    if (!hasFile && !hasLink) return NextResponse.json({ error: "Липсва файл или връзка към документ." }, { status: 400 });
    if (hasFile && hasLink) return NextResponse.json({ error: "Изберете качване ИЛИ връзка, не и двете." }, { status: 400 });

    let fileFields: Record<string, unknown> = {};
    if (hasFile) {
      const v = validateAssetUpload({ mimeType: d.mimeType, size: d.size, dataUrl: d.dataUrl });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      fileFields = {
        filename: d.originalFilename ?? "document",
        originalFilename: d.originalFilename ?? "document",
        mimeType: d.mimeType ?? "application/octet-stream",
        size: d.size ?? 0,
        dataUrl: d.dataUrl,
      };
    } else {
      // Връзка: документът трябва да е на СЪЩАТА фирма (срещу IDOR).
      const linked = await prisma.document.findFirst({ where: { id: d.linkedDocumentId!, companyId }, select: { id: true } });
      if (!linked) return NextResponse.json({ error: "Свързаният документ не е намерен." }, { status: 404 });
      fileFields = { linkedDocumentId: linked.id };
    }

    const doc = await prisma.assetDocument.create({
      data: {
        assetId: id,
        docType: normalizeDocType(d.docType),
        name: d.name ?? null,
        description: d.description ?? null,
        docDate: d.docDate ? new Date(d.docDate) : null,
        number: d.number ?? null,
        issuer: d.issuer ?? null,
        validFrom: d.validFrom ? new Date(d.validFrom) : null,
        validTo: d.validTo ? new Date(d.validTo) : null,
        note: d.note ?? null,
        data: (d.data ?? undefined) as object | undefined,
        reminderDays: normalizeReminderDays(d.reminderDays),
        uploadedById: userId,
        ...fileFields,
      },
      select: listSelect,
    });
    await audit(companyId, userId, "create", "AssetDocument", doc.id,
      `Документ „${doc.name ?? doc.originalFilename ?? doc.docType}" към актив ${id} (${doc.docType})`);
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
