import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";

// Автомобили на фирмата — за авто-попълване на пътни листове / отчети за гориво.
export async function GET() {
  try {
    const { companyId } = await requireCompany();
    const vehicles = await prisma.vehicle.findMany({ where: { companyId }, orderBy: { registration: "asc" } });
    // За picker-а: name = рег. номер + марка/модел (компонентът чете `name`).
    return NextResponse.json(vehicles.map((v) => ({ ...v, name: [v.registration, [v.brand, v.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ") })));
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

const schema = z.object({
  registration: z.string().min(1),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  fuelNorm: z.number().optional().nullable(),
  tankCapacity: z.number().optional().nullable(),
  year: z.number().int().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const d = schema.parse(await req.json());
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId, registration: d.registration.trim().toUpperCase(),
        brand: d.brand || null, model: d.model || null, vin: d.vin || null,
        fuelType: d.fuelType || null, fuelNorm: d.fuelNorm ?? null,
        tankCapacity: d.tankCapacity ?? null, year: d.year ?? null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: vehicle.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
