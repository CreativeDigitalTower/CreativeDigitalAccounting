import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { applyMaterialMovement } from "@/lib/fashion/movements";
import { allocateLandedCosts } from "@/lib/fashion/inventory";
import { audit } from "@/lib/documents";
import { z } from "zod";

export async function GET() {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const deliveries = await prisma.fashionMaterialDelivery.findMany({
    where: { companyId: g.companyId },
    include: { lines: { select: { id: true } } },
    orderBy: { date: "desc" }, take: 500,
  });
  const supplierIds = [...new Set(deliveries.map((d) => d.supplierId).filter(Boolean) as string[])];
  const suppliers = supplierIds.length ? await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } }) : [];
  const nameOf = new Map(suppliers.map((s) => [s.id, s.name]));
  return NextResponse.json(deliveries.map(({ dataUrl: _d, ...d }) => ({
    ...d, supplierName: d.supplierId ? nameOf.get(d.supplierId) ?? null : null, lineCount: d.lines.length,
  })));
}

const lineSchema = z.object({
  materialId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  unitPrice: z.number().min(0),
});
const schema = z.object({
  supplierId: z.string().nullable().optional(),
  date: z.string().optional(),
  invoiceNumber: z.string().max(60).nullable().optional(),
  deliveryNumber: z.string().max(60).nullable().optional(),
  transportCost: z.number().min(0).optional(),
  extraCosts: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  note: z.string().max(1000).nullable().optional(),
  fileName: z.string().nullable().optional(),
  originalFilename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  dataUrl: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
});

// Нова доставка: транзакционно създава header + редове, увеличава наличности,
// преизчислява среднопретеглена цена (с разпределени транспортни/доп. разходи) и
// записва PURCHASE движения в ledger-а. Един POST = едно приспадане (idempotent per request).
export async function POST(req: Request) {
  const g = await fashionApiGuard("manage_deliveries");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());

    // Валидира, че всички материали са на фирмата.
    const ids = [...new Set(d.lines.map((l) => l.materialId))];
    const materials = await prisma.fashionMaterial.findMany({ where: { id: { in: ids }, companyId: g.companyId }, select: { id: true, unit: true } });
    if (materials.length !== ids.length) return NextResponse.json({ error: "Невалиден материал в доставката." }, { status: 400 });
    const unitOf = new Map(materials.map((m) => [m.id, m.unit]));
    if (d.supplierId) {
      const s = await prisma.supplier.findFirst({ where: { id: d.supplierId, companyId: g.companyId }, select: { id: true } });
      if (!s) return NextResponse.json({ error: "Доставчикът не е намерен." }, { status: 404 });
    }

    const extraTotal = (d.transportCost ?? 0) + (d.extraCosts ?? 0);
    const allocated = allocateLandedCosts(d.lines.map((l) => ({ materialId: l.materialId, quantity: l.quantity, unit: l.unit ?? unitOf.get(l.materialId) ?? "m", unitPrice: l.unitPrice })), extraTotal);
    const date = d.date ? new Date(d.date) : new Date();

    const delivery = await prisma.$transaction(async (tx) => {
      const del = await tx.fashionMaterialDelivery.create({
        data: {
          companyId: g.companyId, supplierId: d.supplierId ?? null, date,
          invoiceNumber: d.invoiceNumber ?? null, deliveryNumber: d.deliveryNumber ?? null,
          transportCost: d.transportCost ?? 0, extraCosts: d.extraCosts ?? 0, currency: d.currency ?? "EUR",
          note: d.note ?? null, fileName: d.fileName ?? null, originalFilename: d.originalFilename ?? null,
          mimeType: d.mimeType ?? null, dataUrl: d.dataUrl ?? null, createdById: g.userId,
        },
        select: { id: true },
      });
      for (const line of allocated) {
        await tx.fashionDeliveryLine.create({
          data: {
            deliveryId: del.id, materialId: line.materialId, quantity: line.quantity, unit: line.unit,
            unitPrice: line.unitPrice, lineTotal: line.lineTotal, allocatedExtra: line.allocatedExtra, landedUnitCost: line.landedUnitCost,
          },
        });
        // Увеличава наличност + преизчислява avg (среднопретеглена по landed cost) + PURCHASE движение.
        await applyMaterialMovement(tx, g.companyId, {
          materialId: line.materialId, type: "PURCHASE", direction: "in", quantity: line.quantity,
          unit: line.unit, unitCost: line.landedUnitCost, sourceType: "FashionMaterialDelivery", sourceId: del.id,
          userId: g.userId, date,
        }, true); // за „in" няма проверка за наличност
      }
      return del;
    });

    await audit(g.companyId, g.userId, "create", "FashionMaterialDelivery", delivery.id, `Доставка · ${allocated.length} реда`);
    return NextResponse.json({ id: delivery.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
