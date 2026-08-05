import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { sanitizePdfFilename, bytesToPdfDataUrl } from "@/lib/attachments";
import { readPdfMultipart } from "@/lib/attachmentUpload";

// Максималният брой приложения на един документ (DoS/quota предпазка).
const MAX_ATTACHMENTS_PER_DOC = 15;

/** Проверява, че документът принадлежи на текущата фирма. */
async function ownedDoc(companyId: string, docId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { id: true, companyId: true } });
  return doc && doc.companyId === companyId ? doc : null;
}

// GET → списък с приложенията (метаданни, без съдържание)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await ownedDoc(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const list = await prisma.documentAttachment.findMany({
      where: { documentId: id },
      select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, pages: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// POST → качване на PDF приложение (multipart/form-data, BINARY — без base64 по мрежата)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  let companyId = "", userId = "", id = "";
  try {
    ({ companyId, userId } = await requireCompany());
    ({ id } = await params);
    if (!(await ownedDoc(companyId, id))) return NextResponse.json({ error: "Не е намерен.", requestId }, { status: 404 });

    const count = await prisma.documentAttachment.count({ where: { documentId: id } });
    if (count >= MAX_ATTACHMENTS_PER_DOC) {
      return NextResponse.json({ error: `Достигнат е максималният брой приложения (${MAX_ATTACHMENTS_PER_DOC}).`, code: "too_many", requestId }, { status: 400 });
    }

    const up = await readPdfMultipart(req);
    if (!up.ok) {
      console.warn("[attachment-upload] rejected", { requestId, companyId, userId, documentId: id, code: up.code, status: up.status });
      return NextResponse.json({ error: up.error, code: up.code, requestId }, { status: up.status });
    }

    const filename = sanitizePdfFilename(up.filename);
    try {
      const att = await prisma.documentAttachment.create({
        data: {
          documentId: id, filename, originalFilename: up.filename.slice(0, 255),
          mimeType: "application/pdf", size: up.size, pages: up.pages,
          dataUrl: bytesToPdfDataUrl(up.bytes), uploadedById: userId,
        },
        select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, pages: true, createdAt: true },
      });
      return NextResponse.json(att);
    } catch (dbErr) {
      console.error("[attachment-upload] storage error", { requestId, companyId, userId, documentId: id, size: up.size, err: String(dbErr).slice(0, 200) });
      return NextResponse.json({ error: "Файлът е в разрешения размер, но не успяхме да го запишем. Опитайте отново.", code: "storage", requestId }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Сървърна грешка.", requestId }, { status: 500 });
  }
}
