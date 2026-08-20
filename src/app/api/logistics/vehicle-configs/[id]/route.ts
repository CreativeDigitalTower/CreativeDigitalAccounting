import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { CARGO_MODES } from "@/lib/logistics/fleet";
import { z } from "zod";

// Допълване/корекция на конфигурация (напр. липсващ шофьор/капацитет, §34).
const schema = z.object({
  trailerReg: z.string().max(60).nullable().optional(),
  defaultDriver: z.string().max(120).nullable().optional(),
  driverPhone: z.string().max(40).nullable().optional(),
  cargoMode: z.enum([...CARGO_MODES, ""]).optional(),
  maxPayloadTons: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.vehicleConfiguration.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());
    const data: Record<string, unknown> = { ...d };
    if (d.trailerReg !== undefined) data.trailerRegNorm = d.trailerReg ? normalizeRegistration(d.trailerReg) : "";
    const cfg = await prisma.vehicleConfiguration.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "VehicleConfiguration", id, "Редакция на конфигурация");
    return NextResponse.json(cfg);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
