import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  importantNotes: z.string().optional().nullable(),
  links: z.record(z.string(), z.string()).optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

// PATCH — редакция на табло (име, важни изисквания, връзки). Само за екипа.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, isEmployee } = await requireProjectAccess();
    if (isEmployee) return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    const { id } = await params;
    const existing = await prisma.projectBoard.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
    const d = schema.parse(await req.json());
    const board = await prisma.projectBoard.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.importantNotes !== undefined ? { importantNotes: d.importantNotes } : {}),
        ...(d.links !== undefined ? { links: d.links ? JSON.stringify(d.links) : null } : {}),
        ...(d.color !== undefined ? { color: d.color } : {}),
        ...(d.order !== undefined ? { order: d.order } : {}),
      },
    });
    return NextResponse.json(board);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, isEmployee } = await requireProjectAccess();
    if (isEmployee) return NextResponse.json({ error: "Нямате права за тази операция." }, { status: 403 });
    const { id } = await params;
    const existing = await prisma.projectBoard.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
    await prisma.projectBoard.delete({ where: { id } }); // задачите се трият каскадно
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
