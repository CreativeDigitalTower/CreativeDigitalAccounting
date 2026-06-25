import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  productName: z.string().min(1),
  ingredients: z.string().optional().nullable(),
  preparation: z.string().optional().nullable(),
  bakingTime: z.string().optional().nullable(),
  bakingTemp: z.string().optional().nullable(),
  cooling: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  shelfLife: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("haccp");
    const { id } = await params;
    const ex = await prisma.technologicalDoc.findUnique({ where: { id } });
    if (!ex || ex.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
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
