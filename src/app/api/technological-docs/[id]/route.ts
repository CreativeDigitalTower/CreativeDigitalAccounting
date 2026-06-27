import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";
import { tdSchema } from "../route";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("haccp");
    const { id } = await params;
    const ex = await prisma.technologicalDoc.findUnique({ where: { id } });
    if (!ex || ex.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = tdSchema.parse(await req.json());
    const doc = await prisma.technologicalDoc.update({ where: { id }, data });
    return NextResponse.json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("haccp");
    const { id } = await params;
    const ex = await prisma.technologicalDoc.findUnique({ where: { id } });
    if (!ex || ex.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.technologicalDoc.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
