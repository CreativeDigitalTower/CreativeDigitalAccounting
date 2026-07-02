import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { validateUpload } from "@/lib/fileSecurity";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  autoRenew: z.boolean().optional(),
  status: z.enum(["active", "expired", "cancelled"]).optional(),
  value: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.contract.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const d = schema.parse(await req.json());
    if (d.attachmentUrl) {
      const v = validateUpload({ dataUrl: d.attachmentUrl });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.startDate !== undefined ? { startDate: new Date(d.startDate) } : {}),
        ...(d.endDate !== undefined ? { endDate: d.endDate ? new Date(d.endDate) : null } : {}),
        ...(d.autoRenew !== undefined ? { autoRenew: d.autoRenew } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.value !== undefined ? { value: d.value } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.attachmentUrl !== undefined ? { attachmentUrl: d.attachmentUrl } : {}),
      },
    });
    return NextResponse.json(contract);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    const existing = await prisma.contract.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
