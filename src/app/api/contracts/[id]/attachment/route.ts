import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { decodeDataUrl, fileResponse } from "@/lib/fileSecurity";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;
  const url = new URL(req.url);
  const c = await prisma.contract.findFirst({ where: { id, companyId }, select: { attachmentUrl: true, title: true } });
  if (!c?.attachmentUrl) return new Response("Няма прикачен файл", { status: 404 });
  const decoded = decodeDataUrl(c.attachmentUrl);
  if (!decoded) {
    if (/^https:\/\//i.test(c.attachmentUrl)) return Response.redirect(c.attachmentUrl);
    return new Response("Невалиден файл", { status: 400 });
  }
  const mime = decoded.mime;
  const ext = mime.includes("pdf") ? "pdf" : mime.includes("word") || mime.includes("doc") ? "docx" : mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "bin";
  const fname = `${(c.title || "договор").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.${ext}`;
  return fileResponse(decoded.buf, mime, fname, !!url.searchParams.get("view"));
}
