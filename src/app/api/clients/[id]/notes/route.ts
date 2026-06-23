import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const { note } = z.object({ note: z.string().min(1) }).parse(await req.json());

    const client = await prisma.client.findFirst({ where: { id, companyId } });
    if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });

    const created = await prisma.clientNote.create({ data: { clientId: id, note } });
    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
