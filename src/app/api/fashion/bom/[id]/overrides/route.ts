import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Upsert на override по (size, color) за конкретен BOM ред. size/color могат да са null
// (само size / само color). DELETE премахва override.
const schema = z.object({
  size: z.string().max(40).nullable().optional(),
  color: z.string().max(80).nullable().optional(),
  quantity: z.number().positive(),
});

async function ownItem(companyId: string, id: string) {
  return prisma.fashionBomItem.findFirst({ where: { id, companyId }, select: { id: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_bom");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await ownItem(g.companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    // Празно (null) се съхранява като "" — за да работи compound unique + upsert.
    const size = (d.size ?? "").trim(), color = (d.color ?? "").trim();
    if (!size && !color) return NextResponse.json({ error: "Задайте размер и/или цвят." }, { status: 400 });
    const ov = await prisma.fashionBomOverride.upsert({
      where: { bomItemId_size_color: { bomItemId: id, size, color } },
      create: { bomItemId: id, size, color, quantity: d.quantity },
      update: { quantity: d.quantity },
    });
    await audit(g.companyId, g.userId, "update", "FashionBomOverride", ov.id, `Override ${size ?? ""}/${color ?? ""}`);
    return NextResponse.json(ov);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_bom");
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!(await ownItem(g.companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  const overrideId = new URL(req.url).searchParams.get("overrideId");
  if (!overrideId) return NextResponse.json({ error: "Липсва overrideId." }, { status: 400 });
  const ov = await prisma.fashionBomOverride.findFirst({ where: { id: overrideId, bomItemId: id }, select: { id: true } });
  if (!ov) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.fashionBomOverride.delete({ where: { id: overrideId } });
  await audit(g.companyId, g.userId, "delete", "FashionBomOverride", overrideId, "Override премахнат");
  return NextResponse.json({ success: true });
}
