import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, exportSetReadRole } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateAttachmentUpload, sanitizeAttachmentFilename, isAttachmentCategory, MAX_ATTACHMENTS_PER_SET } from "@/lib/logistics/attachmentCategories";

const attSelect = {
  id: true, category: true, name: true, originalFilename: true, mimeType: true, size: true,
  documentNumber: true, documentDate: true, notes: true, uploadedById: true, createdAt: true, updatedAt: true,
} as const;

// GET → метаданните на прикачените документи (БЕЗ dataUrl, §50). Достъп: продавач или
// свързан купувач (SEM) в същата група (read-only source dossier, §36).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const set = await prisma.exportDocumentSet.findUnique({ where: { id }, select: { companyId: true, buyerCompanyId: true } });
  if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  if (!(await exportSetReadRole(g.companyId, set))) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  const list = await prisma.exportAttachment.findMany({ where: { exportSetId: id }, select: attSelect, orderBy: { createdAt: "asc" } });
  return NextResponse.json(list);
}

// POST → качване (multipart/form-data). Само собственикът (BG) с manage_documents (§44).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    // Собственост: досието трябва да е на активната фирма (IDOR-safe, §42). Изтрито → не.
    const set = await prisma.exportDocumentSet.findFirst({ where: { id, companyId: g.companyId, deletedAt: null }, select: { id: true } });
    if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

    const count = await prisma.exportAttachment.count({ where: { exportSetId: id } });
    if (count >= MAX_ATTACHMENTS_PER_SET) return NextResponse.json({ error: `Достигнат е максималният брой документи (${MAX_ATTACHMENTS_PER_SET}).` }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Липсва файл." }, { status: 400 });
    const category = String(form.get("category") ?? "other");
    if (!isAttachmentCategory(category)) return NextResponse.json({ error: "Невалидна категория." }, { status: 400 });

    const original = sanitizeAttachmentFilename(file.name);
    const check = validateAttachmentUpload({ filename: original, mimeType: file.type, size: file.size });
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${check.mime};base64,${bytes.toString("base64")}`;
    const name = (String(form.get("name") ?? "").trim() || original).slice(0, 200);
    const documentNumber = (String(form.get("documentNumber") ?? "").trim() || null)?.slice(0, 60) ?? null;
    const dd = String(form.get("documentDate") ?? "").trim();
    const documentDate = dd ? new Date(dd) : null;
    const notes = (String(form.get("notes") ?? "").trim() || null)?.slice(0, 2000) ?? null;

    const att = await prisma.exportAttachment.create({
      data: { companyId: g.companyId, exportSetId: id, category, name, originalFilename: original, mimeType: check.mime, size: file.size, dataUrl, documentNumber, documentDate, notes, uploadedById: g.userId },
      select: attSelect,
    });
    await audit(g.companyId, g.userId, "attach", "ExportDocumentSet", id, `Прикачен документ „${name}" (${category})`);
    return NextResponse.json(att);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
