import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { fileResponse } from "@/lib/fileSecurity";
import { sanitizePdfFilename, bytesToPdfDataUrl } from "@/lib/attachments";
import { readPdfMultipart } from "@/lib/attachmentUpload";

/** Приложение, което принадлежи на документ на текущата фирма (company scoping). */
async function ownedAttachment(companyId: string, docId: string, attId: string) {
  const att = await prisma.documentAttachment.findFirst({
    where: { id: attId, documentId: docId, document: { companyId } },
  });
  return att;
}

// GET → защитено сваляне/преглед (само оторизиран потребител на фирмата)
export async function GET(req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id, attId } = await params;
    const att = await ownedAttachment(companyId, id, attId);
    if (!att) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const base64 = att.dataUrl.includes(",") ? att.dataUrl.split(",")[1] : att.dataUrl;
    const buffer = Buffer.from(base64, "base64");
    return fileResponse(buffer, "application/pdf", att.filename, inline);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// PUT → замяна на файла (пази същия ред/id). Multipart binary, като POST.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const requestId = randomUUID();
  let companyId = "", userId = "", id = "", attId = "";
  try {
    ({ companyId, userId } = await requireCompany());
    ({ id, attId } = await params);
    if (!(await ownedAttachment(companyId, id, attId))) return NextResponse.json({ error: "Не е намерен.", requestId }, { status: 404 });

    const up = await readPdfMultipart(req);
    if (!up.ok) {
      console.warn("[attachment-replace] rejected", { requestId, companyId, userId, documentId: id, attId, code: up.code, status: up.status });
      return NextResponse.json({ error: up.error, code: up.code, requestId }, { status: up.status });
    }
    try {
      const att = await prisma.documentAttachment.update({
        where: { id: attId },
        data: {
          filename: sanitizePdfFilename(up.filename), originalFilename: up.filename.slice(0, 255),
          mimeType: "application/pdf", size: up.size, pages: up.pages, dataUrl: bytesToPdfDataUrl(up.bytes), uploadedById: userId,
        },
        select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, pages: true, createdAt: true },
      });
      return NextResponse.json(att);
    } catch (dbErr) {
      console.error("[attachment-replace] storage error", { requestId, companyId, documentId: id, attId, err: String(dbErr).slice(0, 200) });
      return NextResponse.json({ error: "Файлът е в разрешения размер, но не успяхме да го запишем. Опитайте отново.", code: "storage", requestId }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Сървърна грешка.", requestId }, { status: 500 });
  }
}

// DELETE → премахване на приложение (не засяга стойностите/номера на фактурата)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id, attId } = await params;
    if (!(await ownedAttachment(companyId, id, attId))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.documentAttachment.delete({ where: { id: attId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
