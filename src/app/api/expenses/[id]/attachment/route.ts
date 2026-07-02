import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { decodeDataUrl, fileResponse } from "@/lib/fileSecurity";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;
  const url = new URL(req.url);
  const exp = await prisma.expense.findFirst({ where: { id, companyId }, select: { attachmentUrl: true, description: true } });
  if (!exp?.attachmentUrl) return new Response("Няма прикачен файл", { status: 404 });

  const decoded = decodeDataUrl(exp.attachmentUrl);
  if (!decoded) {
    // Не е data URL — пренасочваме само към сигурни https линкове (без open redirect).
    if (/^https:\/\//i.test(exp.attachmentUrl)) return Response.redirect(exp.attachmentUrl);
    return new Response("Невалиден файл", { status: 400 });
  }
  const ext = decoded.mime.includes("pdf") ? "pdf" : decoded.mime.includes("png") ? "png" : decoded.mime.includes("jpeg") ? "jpg" : "bin";
  const fname = `${(exp.description || "разход").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.${ext}`;
  return fileResponse(decoded.buf, decoded.mime, fname, !!url.searchParams.get("view"));
}
