import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { fileResponse } from "@/lib/fileSecurity";

// Защитено сервиране на PDF сертификата (company + module + view право, §30).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const prod = await prisma.logisticsProduct.findFirst({
    where: { id, companyId: g.companyId },
    select: { certificateFileData: true, certificateFileName: true, certificateFileMime: true },
  });
  if (!prod?.certificateFileData) return NextResponse.json({ error: "Няма сертификат." }, { status: 404 });
  const wantInline = new URL(req.url).searchParams.get("inline") === "1";
  const base64 = prod.certificateFileData.includes(",") ? prod.certificateFileData.split(",")[1] : prod.certificateFileData;
  return fileResponse(Buffer.from(base64, "base64"), prod.certificateFileMime ?? "application/pdf", prod.certificateFileName ?? "certificate.pdf", wantInline);
}
