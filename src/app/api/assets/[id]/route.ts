import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  acquiredDate: z.string().optional(),
  value: z.number().min(0).optional(),
  annualDepreciation: z.number().min(0).optional(),
  bookValue: z.number().min(0).optional(),
  warrantyUntil: z.string().nullable().optional(),
  insuranceUntil: z.string().nullable().optional(),
  status: z.enum(["in_use", "maintenance", "sold", "scrapped", "written_off"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("assets");
    const { id } = await params;
    const existing = await prisma.asset.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const d = schema.parse(await req.json());
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.acquiredDate !== undefined ? { acquiredDate: new Date(d.acquiredDate) } : {}),
        ...(d.value !== undefined ? { value: d.value } : {}),
        ...(d.annualDepreciation !== undefined ? { annualDepreciation: d.annualDepreciation } : {}),
        ...(d.bookValue !== undefined ? { bookValue: d.bookValue } : {}),
        ...(d.warrantyUntil !== undefined ? { warrantyUntil: d.warrantyUntil ? new Date(d.warrantyUntil) : null } : {}),
        ...(d.insuranceUntil !== undefined ? { insuranceUntil: d.insuranceUntil ? new Date(d.insuranceUntil) : null } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
    });
    return NextResponse.json(asset);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("assets");
    const { id } = await params;
    const existing = await prisma.asset.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
