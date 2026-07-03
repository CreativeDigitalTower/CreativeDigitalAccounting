import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  note: z.string().optional().nullable(),
});
const patchSchema = z.object({
  id: z.string(),
  done: z.boolean().optional(),
  title: z.string().min(1).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { companyId } = await requireFeature("tax_calendar");
    const items = await prisma.taxReminder.findMany({ where: { companyId }, orderBy: { dueDate: "asc" } });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("tax_calendar");
    const data = schema.parse(await req.json());
    const item = await prisma.taxReminder.create({ data: { companyId, title: data.title, dueDate: new Date(data.dueDate), priority: data.priority ?? "normal", note: data.note ?? null } });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { companyId } = await requireFeature("tax_calendar");
    const data = patchSchema.parse(await req.json());
    const r = await prisma.taxReminder.findUnique({ where: { id: data.id } });
    if (!r || r.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.taxReminder.update({
      where: { id: data.id },
      data: {
        ...(data.done !== undefined ? { done: data.done } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.progress !== undefined ? { progress: data.progress, done: data.progress >= 100 ? true : r.done } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId } = await requireFeature("tax_calendar");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Липсва id." }, { status: 400 });
    const r = await prisma.taxReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.taxReminder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
