import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), parentId: z.string().optional().nullable() });

export async function GET() {
  try {
    const { companyId } = await requireFeature("stock_categories");
    const cats = await prisma.stockCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } });
    return NextResponse.json(cats);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("stock_categories");
    const data = schema.parse(await req.json());
    const cat = await prisma.stockCategory.create({ data: { companyId, name: data.name, parentId: data.parentId ?? null } });
    return NextResponse.json(cat);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId } = await requireFeature("stock_categories");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Липсва id." }, { status: 400 });
    const cat = await prisma.stockCategory.findUnique({ where: { id } });
    if (!cat || cat.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.stockItem.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.stockCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
