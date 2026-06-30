import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  budget: z.number().min(0).nullable().optional(),
  deadline: z.string().nullable().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    const existing = await prisma.project.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const d = schema.parse(await req.json());
    const p = await prisma.project.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
        ...(d.budget !== undefined ? { budget: d.budget } : {}),
        ...(d.deadline !== undefined ? { deadline: d.deadline ? new Date(d.deadline) : null } : {}),
        ...(d.progressPercent !== undefined ? { progressPercent: d.progressPercent } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
      },
    });
    return NextResponse.json(p);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    const existing = await prisma.project.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
