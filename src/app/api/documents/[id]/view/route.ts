import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { toDocData } from "@/lib/docView";

// Връща данните за визуализация на документ (за генериране на PDF).
// Достъпно както за собствени документи, така и за входящи (издадени към фирмата).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const doc = await prisma.document.findFirst({
      where: { id, OR: [{ companyId }, { recipientCompanyId: companyId }] },
      include: { client: true, lines: true, company: { include: { subscription: true } } },
    });
    if (!doc) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    return NextResponse.json(toDocData(doc));
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
