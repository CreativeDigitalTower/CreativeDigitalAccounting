import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/session";
import { PM_STATUS_IDS, PM_PRIORITY_IDS } from "@/lib/pm";
import { z } from "zod";

const linkSchema = z.object({ label: z.string(), url: z.string() });
const schema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  priority: z.enum(PM_PRIORITY_IDS as unknown as [string, ...string[]]).optional(),
  status: z.enum(PM_STATUS_IDS as unknown as [string, ...string[]]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  links: z.array(linkSchema).optional().nullable(),
  boardId: z.string().optional(),
});

// PATCH — редакция/смяна на статус (всеки член на фирмата, вкл. служители)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireProjectAccess();
    const { id } = await params;
    const existing = await prisma.projectTask.findFirst({ where: { id, companyId }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    // При статус „Изпълнена" прогресът става 100%
    const progress = d.status === "done" ? 100 : d.progress;
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.priority !== undefined ? { priority: d.priority } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(progress !== undefined ? { progress } : {}),
        ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
        ...(d.links !== undefined ? { links: d.links && d.links.length ? JSON.stringify(d.links) : null } : {}),
        ...(d.boardId !== undefined ? { boardId: d.boardId } : {}),
      },
    });
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireProjectAccess();
    const { id } = await params;
    const existing = await prisma.projectTask.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    await prisma.projectTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
