import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isSuperAdmin } from "@/lib/session";

// Сваляне на прикачен файл — само собствената фирма или Super Admin (§19, §26).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attId: string }> }) {
  const { userId, companyId } = await requireCompany();
  const { id, attId } = await params;
  const admin = await isSuperAdmin(userId);
  const att = await prisma.featureRequestAttachment.findFirst({
    where: { id: attId, requestId: id, ...(admin ? {} : { request: { companyId } }) },
    select: { fileName: true, mimeType: true, dataUrl: true },
  });
  if (!att) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const m = att.dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  const buf = Buffer.from(m ? m[2] : att.dataUrl.replace(/^data:[^,]*,/, ""), "base64");
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": att.mimeType, "Content-Disposition": `attachment; filename="${encodeURIComponent(att.fileName)}"` },
  });
}
