import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

async function owned(companyId: string, id: string) {
  return prisma.vehicle.findFirst({ where: { id, companyId }, select: { id: true } });
}

const patchSchema = z.object({
  active: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  // логистичен профил (companion)
  trailerReg: z.string().max(40).nullable().optional(),
  carrierId: z.string().nullable().optional(),
  defaultDriver: z.string().max(120).nullable().optional(),
  ownershipType: z.enum(["own", "carrier", "subcontractor", "unspecified"]).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await owned(g.companyId, id))) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    const d = patchSchema.parse(await req.json());

    const vehData: Record<string, unknown> = {};
    if (d.active !== undefined) vehData.active = d.active;
    if (d.notes !== undefined) vehData.notes = d.notes;
    if (Object.keys(vehData).length) await prisma.vehicle.update({ where: { id }, data: vehData });

    const profData: Record<string, unknown> = {};
    if (d.trailerReg !== undefined) profData.trailerReg = d.trailerReg;
    if (d.carrierId !== undefined) profData.carrierId = d.carrierId;
    if (d.defaultDriver !== undefined) profData.defaultDriver = d.defaultDriver;
    if (d.ownershipType !== undefined) profData.ownershipType = d.ownershipType ?? "unspecified";
    if (Object.keys(profData).length) {
      await prisma.vehicleLogisticsProfile.upsert({
        where: { vehicleId: id },
        create: { vehicleId: id, ...profData },
        update: profData,
      });
    }

    await audit(g.companyId, g.userId, "update", "Vehicle", id, "Редакция на автомобил/досие");
    const fresh = await prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true, registration: true, active: true, notes: true,
        logisticsProfile: { select: { trailerReg: true, carrierId: true, defaultDriver: true, ownershipType: true } },
        aliases: { select: { id: true, alias: true } },
      },
    });
    return NextResponse.json(fresh);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
