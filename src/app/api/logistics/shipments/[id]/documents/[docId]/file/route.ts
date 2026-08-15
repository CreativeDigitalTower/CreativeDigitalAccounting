import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { fileResponse } from "@/lib/fileSecurity";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id, docId } = await params;
  const doc = await prisma.shipmentDocument.findFirst({
    where: { id: docId, shipmentId: id, deletedAt: null, shipment: { companyId: g.companyId } },
    select: { dataUrl: true, mimeType: true, originalFilename: true },
  });
  if (!doc?.dataUrl) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const wantInline = new URL(req.url).searchParams.get("inline") === "1";
  const base64 = doc.dataUrl.includes(",") ? doc.dataUrl.split(",")[1] : doc.dataUrl;
  return fileResponse(Buffer.from(base64, "base64"), doc.mimeType ?? "application/octet-stream", doc.originalFilename ?? "document", wantInline);
}
