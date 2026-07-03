import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/session";
import { PM_STATUS_IDS, PM_PRIORITY_IDS } from "@/lib/pm";
import { z } from "zod";

const linkSchema = z.object({ label: z.string(), url: z.string() });
const schema = z.object({
  boardId: z.string(),
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  priority: z.enum(PM_PRIORITY_IDS as unknown as [string, ...string[]]).optional(),
  status: z.enum(PM_STATUS_IDS as unknown as [string, ...string[]]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  links: z.array(linkSchema).optional().nullable(),
  monthly: z.boolean().optional(),
});

// POST — създаване на задача (всеки член на фирмата, вкл. служители)
export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireProjectAccess();
    const d = schema.parse(await req.json());
    const board = await prisma.projectBoard.findFirst({ where: { id: d.boardId, companyId }, select: { id: true } });
    if (!board) return NextResponse.json({ error: "Невалидно табло." }, { status: 400 });
    const count = await prisma.projectTask.count({ where: { boardId: d.boardId, monthly: d.monthly ?? false } });
    const task = await prisma.projectTask.create({
      data: {
        companyId, boardId: d.boardId, title: d.title, notes: d.notes ?? null,
        priority: d.priority ?? "normal", status: d.status ?? "pending", progress: d.progress ?? 0,
        assigneeId: d.assigneeId ?? null, dueDate: d.dueDate ? new Date(d.dueDate) : null,
        links: d.links && d.links.length ? JSON.stringify(d.links) : null,
        monthly: d.monthly ?? false, order: count, createdById: userId,
      },
    });
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
