import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, getMyRole } from "@/lib/session";
import { fileResponse } from "@/lib/fileSecurity";
import { canAssetDoc } from "@/lib/assetDocuments";

/**
 * Защитено сервиране на прикачен документ (преглед/сваляне). Достъпът минава през:
 * фирма (company scoping) + притежание на актива + право „view". Файловете НЕ са
 * публични. `?inline=1` показва inline (само за безопасни типове — PDF/изображения).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { companyId, userId } = await requireFeature("assets");
    const role = await getMyRole(userId, companyId);
    if (!canAssetDoc(role, "view")) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
    const { id, docId } = await params;
    const doc = await prisma.assetDocument.findFirst({
      where: { id: docId, assetId: id, deletedAt: null, asset: { companyId } },
      select: {
        dataUrl: true, mimeType: true, filename: true, originalFilename: true, linkedDocumentId: true,
        linkedDocument: { select: { id: true, companyId: true, attachments: { take: 1, select: { dataUrl: true, mimeType: true, filename: true } } } },
      },
    });
    if (!doc) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const wantInline = new URL(req.url).searchParams.get("inline") === "1";

    // Собствен файл
    if (doc.dataUrl) {
      const base64 = doc.dataUrl.includes(",") ? doc.dataUrl.split(",")[1] : doc.dataUrl;
      const buffer = Buffer.from(base64, "base64");
      return fileResponse(buffer, doc.mimeType ?? "application/octet-stream", doc.originalFilename ?? doc.filename ?? "document", wantInline);
    }
    // Свързан документ — сервираме първото му приложение (ако е на същата фирма).
    if (doc.linkedDocument && doc.linkedDocument.companyId === companyId) {
      const att = doc.linkedDocument.attachments[0];
      if (att?.dataUrl) {
        const base64 = att.dataUrl.includes(",") ? att.dataUrl.split(",")[1] : att.dataUrl;
        return fileResponse(Buffer.from(base64, "base64"), att.mimeType ?? "application/pdf", att.filename ?? "document.pdf", wantInline);
      }
      // Няма приложен файл → пренасочваме към страницата на документа.
      return NextResponse.redirect(new URL(`/dashboard/invoices/${doc.linkedDocument.id}`, req.url));
    }
    return NextResponse.json({ error: "Файлът не е наличен." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
