import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.supplier.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const data = schema.parse(await req.json());
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { ...data, contactEmail: data.contactEmail || null },
    });
    return NextResponse.json(supplier);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.supplier.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
