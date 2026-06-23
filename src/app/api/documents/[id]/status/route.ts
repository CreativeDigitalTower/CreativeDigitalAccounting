import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["draft", "issued", "sent", "partially_paid", "paid", "overdue", "cancelled"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, userId } = await requireCompany();
    const { id } = await params;
    const { status } = schema.parse(await req.json());

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc || doc.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    await prisma.document.update({ where: { id }, data: { status } });
    await audit(companyId, userId, "status_change", "Document", id, `${doc.number} → ${status}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалиден статус." }, { status: 400 });
    }
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
