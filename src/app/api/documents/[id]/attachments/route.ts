import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { validatePdfUpload, sanitizePdfFilename, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";
import { z } from "zod";

/** Проверява, че документът принадлежи на текущата фирма. */
async function ownedDoc(companyId: string, docId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { id: true, companyId: true } });
  return doc && doc.companyId === companyId ? doc : null;
}

const schema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "Файлът е твърде голям (макс. 8 MB)."),
  dataUrl: z.string().min(1),
});

// GET → списък с приложенията (метаданни, без съдържание)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await ownedDoc(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const list = await prisma.documentAttachment.findMany({
      where: { documentId: id },
      select: { id: true, filename: true, originalFilename: true, mimeType: true, size: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// POST → качване на PDF приложение
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id } = await params;
    if (!(await ownedDoc(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const v = validatePdfUpload(data);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const filename = sanitizePdfFilename(data.filename);
    const att = await prisma.documentAttachment.create({
      data: {
        documentId: id, filename, originalFilename: data.filename.slice(0, 255),
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
