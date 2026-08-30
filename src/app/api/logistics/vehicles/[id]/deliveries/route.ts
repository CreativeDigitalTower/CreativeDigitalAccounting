import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Историята на курсовете за конкретен автомобил (§25-§28) — всички export доставки с
// този truckVehicleId. Company-scoped, paginated (§52); връща само broйки на документи.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = 20;

  const veh = await prisma.vehicle.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!veh) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });

  const where = { companyId: g.companyId, truckVehicleId: id, deletedAt: null };
  const [total, sets] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    prisma.exportDocumentSet.findMany({
      where, orderBy: { invoiceDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: {
        id: true, invoiceNumber: true, invoiceDate: true, dispatchNumber: true, trailerReg: true,
        destination: true, productSnapshot: true, quantity: true, unit: true, status: true, clientId: true,
        _count: { select: { attachments: true } },
      },
    }),
  ]);
  const clientIds = [...new Set(sets.map((s) => s.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const cName = new Map(clients.map((c) => [c.id, c.name]));
  const rows = sets.map(({ clientId, _count, ...s }) => ({ ...s, client: (clientId && cName.get(clientId)) || null, attachmentCount: _count.attachments }));
  return NextResponse.json({ rows, total, page, pageSize });
}
