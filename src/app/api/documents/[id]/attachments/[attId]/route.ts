import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { fileResponse } from "@/lib/fileSecurity";
import { validatePdfUpload, sanitizePdfFilename, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";
import { z } from "zod";

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

const putSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "Файлът е твърде голям (макс. 8 MB)."),
  dataUrl: z.string().min(1),
});

// PUT → замяна на файла (пази същия ред/id)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id, attId } = await params;
    if (!(await ownedAttachment(companyId, id, attId))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = putSchema.parse(await req.json());
    const v = validatePdfUpload(data);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const att = await prisma.documentAttachment.update({
      where: { id: attId },
      data: {
        filename: sanitizePdfFilename(data.filename), originalFilename: data.filename.slice(0, 255),
        mimeType: "application/pdf", size: data.size, dataUrl: data.dataUrl, uploadedById: userId,
      },
      select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, createdAt: true },
    });
    return NextResponse.json(att);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
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
