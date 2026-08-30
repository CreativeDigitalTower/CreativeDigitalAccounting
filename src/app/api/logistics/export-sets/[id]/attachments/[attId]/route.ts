import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, exportSetReadRole } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { isAttachmentCategory, sanitizeAttachmentFilename } from "@/lib/logistics/attachmentCategories";
import { z } from "zod";

// GET → сваляне на файла (dataUrl → binary). Достъп: продавач или свързан купувач (§36/§44).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id, attId } = await params;
  const att = await prisma.exportAttachment.findFirst({
    where: { id: attId, exportSetId: id },
    select: { dataUrl: true, mimeType: true, originalFilename: true, exportSet: { select: { companyId: true, buyerCompanyId: true } } },
  });
  if (!att) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  if (!(await exportSetReadRole(g.companyId, att.exportSet))) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  const b64 = att.dataUrl.split(",")[1] ?? "";
  const buf = Buffer.from(b64, "base64");
  const view = new Uint8Array(buf);
  const fn = sanitizeAttachmentFilename(att.originalFilename);
  return new NextResponse(view, {
    headers: { "Content-Type": att.mimeType, "Content-Disposition": `attachment; filename="${fn}"`, "Content-Length": String(view.byteLength) },
  });
}

const patchSchema = z.object({
  category: z.string().optional(),
  name: z.string().max(200).optional(),
  documentNumber: z.string().max(60).nullable().optional(),
  documentDate: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  notes: z.string().max(2000).nullable().optional(),
});

// PATCH → редакция на metadata (§19). Само собственикът (BG) с manage_documents.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id, attId } = await params;
    const att = await prisma.exportAttachment.findFirst({ where: { id: attId, exportSetId: id, companyId: g.companyId }, select: { id: true } });
    if (!att) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (d.category !== undefined) { if (!isAttachmentCategory(d.category)) return NextResponse.json({ error: "Невалидна категория." }, { status: 400 }); data.category = d.category; }
    if (d.name !== undefined) data.name = d.name.trim().slice(0, 200) || undefined;
    if (d.documentNumber !== undefined) data.documentNumber = d.documentNumber?.trim() || null;
    if (d.documentDate !== undefined) data.documentDate = d.documentDate ? new Date(d.documentDate) : null;
    if (d.notes !== undefined) data.notes = d.notes?.trim() || null;
    const updated = await prisma.exportAttachment.update({
      where: { id: attId }, data,
      select: { id: true, category: true, name: true, originalFilename: true, mimeType: true, size: true, documentNumber: true, documentDate: true, notes: true, uploadedById: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// DELETE → премахва metadata + съдържание (§18). Само собственикът (BG) с manage_documents.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  const { id, attId } = await params;
  const att = await prisma.exportAttachment.findFirst({ where: { id: attId, exportSetId: id, companyId: g.companyId }, select: { id: true, name: true } });
  if (!att) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.exportAttachment.delete({ where: { id: attId } });
  await audit(g.companyId, g.userId, "detach", "ExportDocumentSet", id, `Изтрит документ „${att.name}"`);
  return NextResponse.json({ ok: true });
}
