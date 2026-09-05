import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

async function owned(companyId: string, id: string) {
  return prisma.logisticsProduct.findFirst({ where: { id, companyId }, select: { id: true, canonicalName: true } });
}

const schema = z.object({
  dataUrl: z.string().min(1),
  originalFilename: z.string().max(255).optional(),
  mimeType: z.string().max(120).optional(),
  size: z.number().int().nonnegative().optional(),
});

// Качване на PDF сертификат към продукт (§10/§20). Само application/pdf; ползва общата
// attachment валидация. manage_rates право (§30). Inline dataUrl — същият pattern като
// документните прикачени файлове (без нов storage mechanism).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  const { id } = await params;
  const prod = await owned(g.companyId, id);
  if (!prod) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  try {
    const d = schema.parse(await req.json());
    const mime = (d.mimeType ?? "").toLowerCase().split(";")[0].trim() || (d.dataUrl.startsWith("data:") ? d.dataUrl.slice(5).split(/[;,]/)[0].toLowerCase().trim() : "");
    if (mime !== "application/pdf") return NextResponse.json({ error: "Разрешен е само PDF файл." }, { status: 400 });
    const v = validateUpload({ mimeType: "application/pdf", size: d.size, dataUrl: d.dataUrl });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    await prisma.logisticsProduct.update({
      where: { id },
      data: {
        certificateFileData: d.dataUrl, certificateFileName: d.originalFilename?.trim() || "certificate.pdf",
        certificateFileMime: "application/pdf", certificateUploadedAt: new Date(), certificateUploadedById: g.userId,
      },
    });
    await audit(g.companyId, g.userId, "update", "LogisticsProduct", id, `Качен сертификат (PDF) за „${prod.canonicalName}"`);
    return NextResponse.json({ ok: true, certificateFileName: d.originalFilename?.trim() || "certificate.pdf", hasCertificatePdf: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// Изтриване на PDF сертификата (метаданните за номера остават непроменени).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  const { id } = await params;
  const prod = await owned(g.companyId, id);
  if (!prod) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.logisticsProduct.update({
    where: { id },
    data: { certificateFileData: null, certificateFileName: null, certificateFileMime: null, certificateUploadedAt: null, certificateUploadedById: null },
  });
  await audit(g.companyId, g.userId, "delete", "LogisticsProduct", id, `Изтрит сертификат (PDF) за „${prod.canonicalName}"`);
  return NextResponse.json({ ok: true, hasCertificatePdf: false });
}
