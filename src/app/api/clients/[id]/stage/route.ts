import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const { stage } = z.object({ stage: z.enum(["new", "contacted", "proposal", "negotiation", "won", "lost"]) }).parse(await req.json());
    const c = await prisma.client.findUnique({ where: { id } });
    if (!c || c.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.client.update({ where: { id }, data: { stage } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
