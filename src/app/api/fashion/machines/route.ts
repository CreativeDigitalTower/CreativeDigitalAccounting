import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const machines = await prisma.fashionMachine.findMany({
    where: { companyId: g.companyId }, orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(machines);
}

const schema = z.object({ name: z.string().min(1).max(120), type: z.string().max(80).nullable().optional(), note: z.string().max(500).nullable().optional() });

export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_settings");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const m = await prisma.fashionMachine.create({ data: { companyId: g.companyId, name: d.name.trim(), type: d.type ?? null, note: d.note ?? null } });
    await audit(g.companyId, g.userId, "create", "FashionMachine", m.id, `Машина: ${m.name}`);
    return NextResponse.json(m);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
