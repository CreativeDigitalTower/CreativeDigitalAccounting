import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { isValidMilestone } from "@/lib/logistics/config";
import { z } from "zod";

async function ownedShipment(companyId: string, id: string) {
  return prisma.shipment.findFirst({ where: { id, companyId, deletedAt: null }, select: { id: true } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!(await ownedShipment(g.companyId, id))) return NextResponse.json([], { status: 200 });
  const rows = await prisma.shipmentMilestone.findMany({
    where: { shipmentId: id },
    select: { id: true, milestone: true, expectedFrom: true, expectedTo: true, actualAt: true, note: true },
  });
  return NextResponse.json(rows);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  milestone: z.string(),
  expectedFrom: optDate,
  expectedTo: optDate,
  actualAt: optDate,
  note: z.string().max(1000).nullable().optional(),
  confirmNow: z.boolean().optional(), // маркира реалния час = now (ръчно потвърждение)
});

// Upsert на един транспортен етап (очакван диапазон / реален час). Реалният статус на
// курса НЕ се променя автоматично — само данни за етапа (раздел 22).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await ownedShipment(g.companyId, id))) return NextResponse.json({ error: "Курсът не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    if (!isValidMilestone(d.milestone)) return NextResponse.json({ error: "Непознат етап." }, { status: 400 });

    const data = {
      expectedFrom: d.expectedFrom !== undefined ? (d.expectedFrom ? new Date(d.expectedFrom) : null) : undefined,
      expectedTo: d.expectedTo !== undefined ? (d.expectedTo ? new Date(d.expectedTo) : null) : undefined,
      actualAt: d.confirmNow ? new Date() : (d.actualAt !== undefined ? (d.actualAt ? new Date(d.actualAt) : null) : undefined),
      note: d.note ?? undefined,
    };
    const row = await prisma.shipmentMilestone.upsert({
      where: { shipmentId_milestone: { shipmentId: id, milestone: d.milestone } },
      create: {
        shipmentId: id, milestone: d.milestone,
        expectedFrom: data.expectedFrom ?? null, expectedTo: data.expectedTo ?? null, actualAt: data.actualAt ?? null, note: d.note ?? null,
      },
      update: data,
      select: { id: true, milestone: true, expectedFrom: true, expectedTo: true, actualAt: true, note: true },
    });
    await audit(g.companyId, g.userId, "milestone", "Shipment", id, `Етап ${d.milestone}${d.confirmNow ? " потвърден" : ""}`);
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
