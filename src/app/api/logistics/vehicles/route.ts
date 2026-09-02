import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { z } from "zod";

const listSelect = {
  id: true, registration: true, normalizedRegistration: true, active: true, notes: true,
  logisticsProfile: { select: { trailerReg: true, carrierId: true, defaultDriver: true, ownershipType: true } },
  aliases: { select: { id: true, alias: true } },
} as const;

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: g.companyId, normalizedRegistration: { not: null } },
    select: listSelect, orderBy: { registration: "asc" },
  });
  return NextResponse.json(vehicles);
}

const schema = z.object({
  registration: z.string().min(2).max(40),
  trailerReg: z.string().max(40).nullable().optional(),
  carrierId: z.string().nullable().optional(),
  defaultDriver: z.string().max(120).nullable().optional(),
  ownershipType: z.enum(["own", "carrier", "subcontractor", "unspecified"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const norm = normalizeRegistration(d.registration);
    if (!norm) return NextResponse.json({ error: "Невалиден регистрационен номер." }, { status: 400 });

    // Dedup срещу формат разлики (главни/интервали/тирета) + alias резолюция. При съвпадение
    // връщаме СЪЩЕСТВУВАЩИЯ автомобил в 409 тялото, за да може UI-то да го избере (§6/§7/§23),
    // вместо да създава дубликат. Включваме и статуса (архивиран/активен, §23).
    const existing = await prisma.vehicle.findUnique({
      where: { companyId_normalizedRegistration: { companyId: g.companyId, normalizedRegistration: norm } }, select: listSelect,
    });
    if (existing) return NextResponse.json({ error: existing.active ? "Автомобил с този номер вече съществува." : "Автомобилът съществува, но е архивиран.", existing }, { status: 409 });
    const asAlias = await prisma.vehicleAlias.findUnique({
      where: { companyId_normalizedAlias: { companyId: g.companyId, normalizedAlias: norm } }, select: { vehicle: { select: listSelect } } },
    );
    if (asAlias?.vehicle) return NextResponse.json({ error: "Този номер е съкратен запис на съществуващ автомобил.", existing: asAlias.vehicle }, { status: 409 });

    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: g.companyId, registration: d.registration.trim(), normalizedRegistration: norm,
        notes: d.notes ?? null,
        logisticsProfile: {
          create: {
            trailerReg: d.trailerReg ?? null, carrierId: d.carrierId ?? null,
            defaultDriver: d.defaultDriver ?? null, ownershipType: d.ownershipType ?? "unspecified",
          },
        },
      }, select: listSelect,
    });
    await audit(g.companyId, g.userId, "create", "Vehicle", vehicle.id, `Автомобил ${d.registration}`);
    return NextResponse.json(vehicle);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
