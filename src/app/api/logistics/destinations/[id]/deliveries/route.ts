import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

/**
 * История на доставките за ЕДНА дестинация (§5/§6/§13) — canonical по `destinationId`, с
 * server-side pagination + филтри (период, търсене по фактура/изпратница, продукт). Не дублира
 * данни: чете директно от ExportDocumentSet (индекс [companyId, destinationId, shipmentDate]).
 * Всеки ред носи id-то на export set-а за „Отвори" към съществуващия документ.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;

  const dest = await prisma.logisticsDestination.findFirst({ where: { id, companyId: g.companyId }, select: { id: true } });
  if (!dest) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 25));
  const from = sp.get("from");
  const to = sp.get("to");
  const q = (sp.get("q") ?? "").trim();
  const product = (sp.get("product") ?? "").trim();
  const sort = sp.get("sort") === "date_asc" ? "asc" : "desc";

  const where: Prisma.ExportDocumentSetWhereInput = { companyId: g.companyId, deletedAt: null, destinationId: id };
  if (from || to) {
    where.shipmentDate = {};
    if (from) (where.shipmentDate as Prisma.DateTimeNullableFilter).gte = new Date(from);
    if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); (where.shipmentDate as Prisma.DateTimeNullableFilter).lte = end; }
  }
  if (q) where.OR = [
    { invoiceNumber: { contains: q, mode: "insensitive" } },
    { dispatchNumber: { contains: q, mode: "insensitive" } },
  ];
  if (product) where.productSnapshot = { contains: product, mode: "insensitive" };

  const [total, rows] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    prisma.exportDocumentSet.findMany({
      where,
      select: {
        id: true, shipmentDate: true, invoiceNumber: true, dispatchNumber: true, productSnapshot: true,
        quantity: true, unit: true, truckRegSnapshot: true, trailerReg: true, clientId: true, status: true,
      },
      orderBy: { shipmentDate: sort },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Получател = име на крайния клиент (batch, без N+1).
  const clientIds = [...new Set(rows.map((r) => r.clientId).filter((x): x is string => !!x))];
  const clients = clientIds.length ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  return NextResponse.json({
    total, page, pageSize,
    rows: rows.map((r) => ({
      id: r.id, shipmentDate: r.shipmentDate ? r.shipmentDate.toISOString() : null,
      invoiceNumber: r.invoiceNumber, dispatchNumber: r.dispatchNumber, product: r.productSnapshot,
      quantity: r.quantity, unit: r.unit, truck: r.truckRegSnapshot, trailer: r.trailerReg,
      recipient: r.clientId ? clientName.get(r.clientId) ?? null : null, status: r.status,
    })),
  });
}
