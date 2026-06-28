import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

async function owned(companyId: string, clientId: string) {
  const c = await prisma.client.findUnique({ where: { id: clientId } });
  return c && c.companyId === companyId;
}

const schema = z.object({
  title: z.string().min(1),
  type: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const data = schema.parse(await req.json());
    const task = await prisma.clientTask.create({
      data: { clientId: id, title: data.title, type: data.type ?? null, dueDate: data.dueDate ? new Date(data.dueDate) : null },
    });
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const { taskId, done } = z.object({ taskId: z.string(), done: z.boolean() }).parse(await req.json());
    await prisma.clientTask.update({ where: { id: taskId }, data: { done } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompany();
    const { id } = await params;
    if (!(await owned(companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const taskId = new URL(req.url).searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "Липсва taskId." }, { status: 400 });
    await prisma.clientTask.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
