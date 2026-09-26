import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { canonicalDestinationKey, aggregateDestinationDeliveries } from "@/lib/logistics/destinations";
import { z } from "zod";

const select = {
  id: true, name: true, normalizedName: true, country: true, city: true, postalCode: true,
  address: true, code: true, note: true, active: true, defaultRouteId: true, defaultDistanceKm: true,
  defaultCarrierId: true, defaultDeliveryTerm: true, createdAt: true, updatedAt: true,
} as const;

/** Detail: master данни + статистика + история на доставките (canonical = ExportDocumentSet). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;

  const dest = await prisma.logisticsDestination.findFirst({ where: { id, companyId: g.companyId }, select });
  if (!dest) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

  // Всички доставки на фирмата (без изтритите) → филтрираме по relation ИЛИ нормализирано име.
  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId: g.companyId, deletedAt: null },
    select: {
      id: true, destinationId: true, destination: true, shipmentDate: true, quantity: true, unit: true,
      productSnapshot: true, truckRegSnapshot: true, trailerReg: true, clientId: true, status: true, invoiceNumber: true,
    },
    orderBy: { shipmentDate: "desc" },
  });
  const matched = sets.filter((s) =>
    s.destinationId ? s.destinationId === id
      : canonicalDestinationKey(s.destination) === dest.normalizedName,
  );

  // Получател = име на крайния клиент (ако е зададен). Един batch query, без N+1.
  const clientIds = [...new Set(matched.map((s) => s.clientId).filter((x): x is string => !!x))];
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
    : [];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const stats = aggregateDestinationDeliveries(matched);
  const history = matched.map((s) => ({
    id: s.id, shipmentDate: s.shipmentDate ? s.shipmentDate.toISOString() : null,
    invoiceNumber: s.invoiceNumber, product: s.productSnapshot, quantity: s.quantity, unit: s.unit,
    truck: s.truckRegSnapshot, trailer: s.trailerReg, recipient: s.clientId ? clientName.get(s.clientId) ?? null : null, status: s.status,
  }));

  return NextResponse.json({ destination: dest, stats, history });
}

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  country: z.string().max(120).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(40).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  code: z.string().max(60).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  defaultRouteId: z.string().nullable().optional(),
  defaultDistanceKm: z.number().nonnegative().nullable().optional(),
  defaultCarrierId: z.string().nullable().optional(),
  defaultDeliveryTerm: z.enum(["FCA", "CPT"]).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const existing = await prisma.logisticsDestination.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, normalizedName: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = schema.parse(await req.json());

    const data: Record<string, unknown> = { ...d };
    // Промяна на master НЕ пипа финализирани document snapshots (§6). Само актуализира master.
    if (d.name != null) {
      const name = d.name.trim();
      const normalizedName = canonicalDestinationKey(name);
      if (!normalizedName) return NextResponse.json({ error: "Невалидно име на дестинация." }, { status: 400 });
      if (normalizedName !== existing.normalizedName) {
        const dup = await prisma.logisticsDestination.findUnique({
          where: { companyId_normalizedName: { companyId: g.companyId, normalizedName } }, select: { id: true },
        });
        if (dup) return NextResponse.json({ error: "Вече съществува дестинация с това име." }, { status: 409 });
      }
      data.name = name; data.normalizedName = normalizedName;
    }

    const dest = await prisma.logisticsDestination.update({ where: { id }, data, select });
    await audit(g.companyId, g.userId, "update", "LogisticsDestination", id, d.active === false ? "Деактивиране на дестинация" : "Редакция на дестинация");
    return NextResponse.json(dest);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
