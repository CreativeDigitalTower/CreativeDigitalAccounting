import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    const own = await prisma.project.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!own) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const { note, author } = z.object({ note: z.string().min(1), author: z.string().optional() }).parse(await req.json());
    const n = await prisma.projectNote.create({ data: { projectId: id, note, author: author ?? null } });
    return NextResponse.json(n);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireFeature("projects");
    const { id } = await params;
    const own = await prisma.project.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!own) return NextResponse.json({ error: "Не е намерен" }, { status: 404 });
    const noteId = new URL(req.url).searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "Липсва noteId" }, { status: 400 });
    await prisma.projectNote.deleteMany({ where: { id: noteId, projectId: id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
