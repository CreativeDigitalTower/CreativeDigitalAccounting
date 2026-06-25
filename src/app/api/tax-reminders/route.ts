import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ title: z.string().min(1), dueDate: z.string() });

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
    const item = await prisma.taxReminder.create({ data: { companyId, title: data.title, dueDate: new Date(data.dueDate) } });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { companyId } = await requireFeature("tax_calendar");
    const { id, done } = await req.json();
    const r = await prisma.taxReminder.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.taxReminder.update({ where: { id }, data: { done: !!done } });
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
