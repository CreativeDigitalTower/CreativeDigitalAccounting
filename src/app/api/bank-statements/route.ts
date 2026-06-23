import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.enum(["pdf", "excel", "csv"]),
  periodFrom: z.string().optional().nullable(),
  periodTo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const items = await prisma.bankStatement.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, fileType: true, periodFrom: true, periodTo: true, note: true, createdAt: true },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireCompany();
    const data = schema.parse(await req.json());
    const item = await prisma.bankStatement.create({
      data: {
        companyId,
        name: data.name,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        periodFrom: data.periodFrom ? new Date(data.periodFrom) : null,
        periodTo: data.periodTo ? new Date(data.periodTo) : null,
        note: data.note ?? null,
      },
    });
    await audit(companyId, userId, "create", "BankStatement", item.id, data.name);
    return NextResponse.json({ id: item.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
