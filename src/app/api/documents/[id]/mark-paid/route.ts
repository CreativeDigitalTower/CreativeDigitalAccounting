import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { recordDocumentEvent } from "@/lib/documentTracking";
import { redirect } from "next/navigation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc || doc.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    await prisma.document.update({
      where: { id },
      data: { status: "paid" },
    });
    if (doc.status !== "paid") await recordDocumentEvent(id, "paid", { companyId, channel: "system" });

    return NextResponse.redirect(new URL(`/dashboard/documents/${id}`, req.url));
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
