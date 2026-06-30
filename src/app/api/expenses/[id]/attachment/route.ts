import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;
  const url = new URL(req.url);
  const exp = await prisma.expense.findFirst({ where: { id, companyId }, select: { attachmentUrl: true, description: true } });
  if (!exp?.attachmentUrl) return new Response("Няма прикачен файл", { status: 404 });

  const m = exp.attachmentUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) {
    // не е data URL — пренасочваме (ако е външен линк)
    return Response.redirect(exp.attachmentUrl);
  }
  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  const ext = mime.includes("pdf") ? "pdf" : mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "bin";
  const fname = `${(exp.description || "разход").replace(/[^\p{L}\p{N}_-]+/gu, "_")}.${ext}`;
  const disposition = url.searchParams.get("view") ? "inline" : "attachment";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fname)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
