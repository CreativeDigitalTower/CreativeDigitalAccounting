import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  eik: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  mol: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const data = schema.parse(await req.json());

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: { ...data, contactEmail: data.contactEmail || null },
    });
    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    }
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
