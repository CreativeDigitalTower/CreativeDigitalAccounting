import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

// Обединява клиент (id = източник) в друг клиент (intoId = целеви).
// Всички документи, договори, проекти, бележки, задачи, контакти и файлове се прехвърлят,
// пренесеният оборот се сумира, после източникът се изтрива.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const { intoId } = z.object({ intoId: z.string() }).parse(await req.json());
    if (intoId === id) return NextResponse.json({ error: "Изберете различен клиент." }, { status: 400 });

    const [source, target] = await Promise.all([
      prisma.client.findFirst({ where: { id, companyId } }),
      prisma.client.findFirst({ where: { id: intoId, companyId } }),
    ]);
    if (!source || !target) return NextResponse.json({ error: "Клиент не е намерен." }, { status: 404 });

    await prisma.$transaction([
      prisma.document.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.contract.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.project.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.clientNote.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.clientTask.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.clientContact.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.clientFile.updateMany({ where: { clientId: id }, data: { clientId: intoId } }),
      prisma.client.update({ where: { id: intoId }, data: { openingRevenue: (target.openingRevenue ?? 0) + (source.openingRevenue ?? 0) } }),
      prisma.client.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true, into: intoId });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
