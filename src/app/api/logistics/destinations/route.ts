import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { canonicalDestinationKey } from "@/lib/logistics/destinations";
import { z } from "zod";

const select = {
  id: true, name: true, normalizedName: true, country: true, city: true, postalCode: true,
  address: true, code: true, note: true, active: true, defaultRouteId: true, defaultDistanceKm: true,
  defaultCarrierId: true, defaultDeliveryTerm: true, createdAt: true, updatedAt: true,
} as const;

/** Списък дестинации + агрегати от реалните export set доставки (canonical source, §9/§15). */
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;

  const destinations = await prisma.logisticsDestination.findMany({
    where: { companyId: g.companyId }, select, orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  // Агрегати: групиране на export set доставките по destinationId или по нормализирано име
  // (за legacy записи без връзка). Един query, агрегация в паметта.
  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId: g.companyId, deletedAt: null },
    select: { destinationId: true, destination: true, quantity: true, shipmentDate: true },
  });
  type Agg = { count: number; tonsH: number; last: number | null };
  const byId = new Map<string, Agg>();
  const byKey = new Map<string, Agg>();
  const bump = (map: Map<string, Agg>, k: string, q: number | null, d: Date | null) => {
    const a = map.get(k) ?? { count: 0, tonsH: 0, last: null };
    a.count++; a.tonsH += Math.round((q ?? 0) * 100);
    const t = d ? new Date(d).getTime() : null;
    if (t && (!a.last || t > a.last)) a.last = t;
    map.set(k, a);
  };
  for (const s of sets) {
    if (s.destinationId) bump(byId, s.destinationId, s.quantity, s.shipmentDate);
    else { const k = canonicalDestinationKey(s.destination); if (k) bump(byKey, k, s.quantity, s.shipmentDate); }
  }

  const rows = destinations.map((d) => {
    const a = byId.get(d.id) ?? byKey.get(d.normalizedName) ?? { count: 0, tonsH: 0, last: null };
    return {
      ...d,
      deliveries: a.count,
      totalQuantity: Math.round(a.tonsH) / 100,
      lastDeliveryAt: a.last ? new Date(a.last).toISOString() : null,
    };
  });

  return NextResponse.json(rows);
}

const schema = z.object({
  name: z.string().min(1).max(200),
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

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const name = d.name.trim();
    const normalizedName = canonicalDestinationKey(name);
    if (!normalizedName) return NextResponse.json({ error: "Невалидно име на дестинация." }, { status: 400 });

    const dup = await prisma.logisticsDestination.findUnique({
      where: { companyId_normalizedName: { companyId: g.companyId, normalizedName } }, select: { id: true },
    });
    if (dup) return NextResponse.json({ error: "Вече съществува дестинация с това име." }, { status: 409 });

    const dest = await prisma.logisticsDestination.create({
      data: {
        companyId: g.companyId, name, normalizedName,
        country: d.country ?? null, city: d.city ?? null, postalCode: d.postalCode ?? null,
        address: d.address ?? null, code: d.code ?? null, note: d.note ?? null,
        active: d.active ?? true,
        defaultRouteId: d.defaultRouteId || null, defaultDistanceKm: d.defaultDistanceKm ?? null,
        defaultCarrierId: d.defaultCarrierId || null, defaultDeliveryTerm: d.defaultDeliveryTerm ?? null,
      },
      select,
    });
    await audit(g.companyId, g.userId, "create", "LogisticsDestination", dest.id, `Дестинация ${name}`);
    return NextResponse.json(dest);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
