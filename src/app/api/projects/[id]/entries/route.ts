import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["revenue", "expense"]),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

async function own(companyId: string, id: string) {
  return prisma.project.findFirst({ where: { id, companyId }, select: { id: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    if (!(await own(companyId, id))) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const d = schema.parse(await req.json());
    const entry = await prisma.projectEntry.create({
      data: { projectId: id, type: d.type, amount: d.amount, description: d.description ?? null, refType: "manual", date: d.date ? new Date(d.date) : new Date() },
    });
    // поддържаме actualSpent в синхрон
    if (d.type === "expense") await prisma.project.update({ where: { id }, data: { actualSpent: { increment: d.amount } } });
    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    if (!(await own(companyId, id))) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const entryId = new URL(req.url).searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "Липсва entryId" }, { status: 400 });
    const entry = await prisma.projectEntry.findFirst({ where: { id: entryId, projectId: id } });
    if (!entry) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    await prisma.projectEntry.delete({ where: { id: entryId } });
    if (entry.type === "expense") await prisma.project.update({ where: { id }, data: { actualSpent: { decrement: entry.amount } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
