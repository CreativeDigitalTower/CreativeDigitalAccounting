import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_bom");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionBomItem.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const item = await prisma.fashionBomItem.update({ where: { id }, data: d });
    await audit(g.companyId, g.userId, "update", "FashionBomItem", id, "BOM ред редактиран");
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_bom");
  if (!g.ok) return g.res;
  const { id } = await params;
  const existing = await prisma.fashionBomItem.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  await prisma.fashionBomItem.delete({ where: { id } });
  await audit(g.companyId, g.userId, "delete", "FashionBomItem", id, "BOM ред премахнат");
  return NextResponse.json({ success: true });
}
