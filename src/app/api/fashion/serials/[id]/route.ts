import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { SERIAL_STATUSES } from "@/lib/fashion/serialization";
import { z } from "zod";

const schema = z.object({
  status: z.enum(SERIAL_STATUSES).optional(),
  color: z.string().max(80).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
  productionBatch: z.string().max(80).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_production");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const unit = await prisma.fashionSerializedUnit.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, serial: true, status: true } });
    if (!unit) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = { ...d };
    if (d.status === "sold" && unit.status !== "sold") data.soldAt = new Date();
    if (d.status && d.status !== "sold") data.soldAt = null;
    const u = await prisma.fashionSerializedUnit.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "FashionSerializedUnit", id, `№ ${unit.serial}${d.status ? ` → ${d.status}` : ""}`);
    return NextResponse.json(u);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
