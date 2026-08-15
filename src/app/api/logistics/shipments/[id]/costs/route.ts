import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { costBaseAmount, shipmentCostSummary } from "@/lib/logistics/costCalc";
import { sumMoney } from "@/lib/logistics/money";
import { isValidCostType, costIncludedByDefault } from "@/lib/logistics/config";
import { z } from "zod";

const listSelect = {
  id: true, costType: true, amount: true, currency: true, fxRate: true, baseAmount: true,
  vatRate: true, includeInCost: true, auto: true, note: true, createdAt: true,
} as const;

async function loadShipment(companyId: string, id: string) {
  return prisma.shipment.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true, invoiceLinks: { select: { lineTotal: true, currency: true } } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const s = await loadShipment(g.companyId, id);
  if (!s) return NextResponse.json({ costs: [], summary: null }, { status: 200 });
  const [costs, settings] = await Promise.all([
    prisma.importCost.findMany({ where: { shipmentId: id }, select: listSelect, orderBy: { createdAt: "asc" } }),
    prisma.logisticsSettings.findUnique({ where: { companyId: g.companyId }, select: { bgCurrency: true } }),
  ]);
  const purchase = sumMoney(s.invoiceLinks.map((l) => l.lineTotal));
  const summary = shipmentCostSummary(purchase, costs.map((c) => ({ baseAmount: c.baseAmount, includeInCost: c.includeInCost })));
  return NextResponse.json({ costs, summary, baseCurrency: settings?.bgCurrency ?? "EUR" });
}

const schema = z.object({
  costType: z.string().max(40),
  amount: z.number().nonnegative(),
  currency: z.string().max(8).optional(),
  fxRate: z.number().positive().nullable().optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  includeInCost: z.boolean().optional(),
  auto: z.boolean().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_shipments");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    if (!(await loadShipment(g.companyId, id))) return NextResponse.json({ error: "Курсът не е намерен." }, { status: 404 });
    const d = schema.parse(await req.json());
    const costType = isValidCostType(d.costType) ? d.costType : "other";
    const fxRate = d.fxRate ?? 1;
    const baseAmount = costBaseAmount(d.amount, fxRate);
    const includeInCost = d.includeInCost ?? costIncludedByDefault(costType);

    const cost = await prisma.importCost.create({
      data: {
        shipmentId: id, costType, amount: d.amount, currency: d.currency || "EUR", fxRate, baseAmount,
        vatRate: d.vatRate ?? null, includeInCost, auto: d.auto ?? false, note: d.note ?? null, createdById: g.userId,
      }, select: listSelect,
    });
    await audit(g.companyId, g.userId, "create", "ImportCost", cost.id, `Разход (${costType}) към курс ${id}`);
    return NextResponse.json(cost);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
