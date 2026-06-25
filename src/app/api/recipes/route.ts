import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  outputItemId: z.string().optional().nullable(),
  outputQuantity: z.number().positive().default(1),
  note: z.string().optional().nullable(),
  ingredients: z.array(z.object({ stockItemId: z.string(), quantity: z.number().positive() })).default([]),
});

export async function GET() {
  try {
    const { companyId } = await requireFeature("production");
    const recipes = await prisma.recipe.findMany({ where: { companyId }, include: { ingredients: true }, orderBy: { name: "asc" } });
    return NextResponse.json(recipes);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId } = await requireFeature("production");
    const data = schema.parse(await req.json());
    const recipe = await prisma.recipe.create({
      data: {
        companyId, name: data.name, outputItemId: data.outputItemId ?? null,
        outputQuantity: data.outputQuantity, note: data.note ?? null,
        ingredients: { create: data.ingredients.map((i) => ({ stockItemId: i.stockItemId, quantity: i.quantity })) },
      },
      include: { ingredients: true },
    });
    return NextResponse.json(recipe);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId } = await requireFeature("production");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Липсва id." }, { status: 400 });
    const r = await prisma.recipe.findUnique({ where: { id } });
    if (!r || r.companyId !== companyId) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
