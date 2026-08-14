import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { fileResponse } from "@/lib/fileSecurity";

// Защитено сервиране на прикачения оригинален PDF на Holcim фактурата.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const inv = await prisma.supplierInvoice.findFirst({ where: { id, companyId: g.companyId }, select: { dataUrl: true, mimeType: true, originalFilename: true } });
  if (!inv?.dataUrl) return NextResponse.json({ error: "Няма прикачен файл." }, { status: 404 });
  const wantInline = new URL(req.url).searchParams.get("inline") === "1";
  const base64 = inv.dataUrl.includes(",") ? inv.dataUrl.split(",")[1] : inv.dataUrl;
  return fileResponse(Buffer.from(base64, "base64"), inv.mimeType ?? "application/pdf", inv.originalFilename ?? "invoice.pdf", wantInline);
}
