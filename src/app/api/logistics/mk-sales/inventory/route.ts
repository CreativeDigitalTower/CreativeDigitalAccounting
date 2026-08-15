import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { inventoryBalance } from "@/lib/logistics/inventory";

// Налично inventory на MK фирмата: позиции от получени BG→MK фактури с остатък > 0.
// Показва получено / продадено / остатък (раздел 34, 80).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const lines = await prisma.bgMkInvoiceLine.findMany({
    where: { invoice: { counterpartyCompanyId: g.companyId } },
    select: {
      id: true, productSnapshot: true, unit: true, quantity: true,
      invoice: { select: { number: true, date: true } },
      shipment: { select: { code: true } },
      mkAllocations: { select: { quantity: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const out = lines.map((l) => {
    const bal = inventoryBalance(l.quantity, l.mkAllocations.map((a) => a.quantity));
    return {
      id: l.id, productSnapshot: l.productSnapshot, unit: l.unit,
      sourceInvoice: l.invoice.number, shipmentCode: l.shipment?.code ?? null,
      received: bal.received, sold: bal.sold, remaining: bal.remaining,
    };
  }).filter((l) => l.remaining > 0.0001);
  return NextResponse.json(out);
}
