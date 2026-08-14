import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { proformaBalance } from "@/lib/logistics/purchaseCalc";
import { z } from "zod";

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.logisticsProforma.findMany({
    where: { companyId: g.companyId },
    select: {
      id: true, number: true, date: true, supplierId: true, productSnapshot: true,
      initialQuantity: true, unit: true, currency: true, unitPrice: true, status: true, note: true,
      allocations: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const out = rows.map((p) => {
    const bal = proformaBalance(p.initialQuantity, p.allocations.map((a) => a.quantity));
    return { ...p, allocations: undefined, used: bal.used, remaining: bal.remaining, negative: bal.negative };
  });
  return NextResponse.json(out);
}

const schema = z.object({
  number: z.string().max(120).nullable().optional(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  supplierId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  initialQuantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  currency: z.string().max(8).optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_rates");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    let productSnapshot: string | null = null;
    if (d.productId) {
      const p = await prisma.logisticsProduct.findFirst({ where: { id: d.productId, companyId: g.companyId }, select: { canonicalName: true } });
      if (!p) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 });
      productSnapshot = p.canonicalName;
    }
    const proforma = await prisma.logisticsProforma.create({
      data: {
        companyId: g.companyId, number: d.number || null, date: d.date ? new Date(d.date) : null,
        supplierId: d.supplierId || null, productId: d.productId || null, productSnapshot,
        initialQuantity: d.initialQuantity, unit: d.unit || "t", currency: d.currency || "EUR",
        unitPrice: d.unitPrice ?? null, note: d.note ?? null, createdById: g.userId,
      },
      select: { id: true, number: true, initialQuantity: true },
    });
    await audit(g.companyId, g.userId, "create", "LogisticsProforma", proforma.id, `Проформа ${d.number ?? "—"} (${d.initialQuantity})`);
    return NextResponse.json(proforma);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
