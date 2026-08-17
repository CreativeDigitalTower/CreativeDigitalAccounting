import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

const schema = z.object({
  seq: z.number().int().optional(),
  name: z.string().min(1).max(160).optional(),
  categoryId: z.string().nullable().optional(),
  machineId: z.string().nullable().optional(),
  machineLabel: z.string().max(120).nullable().optional(),
  expectedMinutes: z.number().min(0).optional(),
  workstation: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  instructions: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.fashionOperation.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const op = await prisma.fashionOperation.update({ where: { id }, data: { ...d, ...(d.name ? { name: d.name.trim() } : {}) } });
    await audit(g.companyId, g.userId, "update", "FashionOperation", id, `Операция: ${op.name}`);
    return NextResponse.json(op);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  const { id } = await params;
  const existing = await prisma.fashionOperation.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  await prisma.fashionOperation.delete({ where: { id } });
  await audit(g.companyId, g.userId, "delete", "FashionOperation", id, "Операция премахната");
  return NextResponse.json({ success: true });
}
