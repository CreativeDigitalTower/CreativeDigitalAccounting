import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { fgStockValue } from "@/lib/fashion/finishedGoods";

// Списък на готовата продукция (Style+Color+Size) + обобщена стойност по себестойност/retail.
export async function GET(req: Request) {
  const g = await fashionApiGuard("view_fashion");
  if (!g.ok) return g.res;
  const styleId = new URL(req.url).searchParams.get("styleId") || undefined;
  const rows = await prisma.fashionFinishedGood.findMany({
    where: { companyId: g.companyId, ...(styleId ? { styleId } : {}) },
    include: { style: { select: { code: true, name: true } } },
    orderBy: [{ style: { code: "asc" } }, { color: "asc" }, { size: "asc" }],
    take: 5000,
  });
  const value = fgStockValue(rows.map((r) => ({ available: r.available, unitCost: r.unitCost, retailPrice: r.retailPrice })));
  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id, sku: r.sku, styleCode: r.style.code, styleName: r.style.name, color: r.color, size: r.size,
      available: r.available, produced: r.produced, sold: r.sold, reserved: r.reserved, gifted: r.gifted,
      marketing: r.marketing, scrapped: r.scrapped, unitCost: r.unitCost, retailPrice: r.retailPrice,
      stockValue: Math.round(r.available * r.unitCost * 100) / 100,
    })),
    totalCost: value.cost, totalRetail: value.retail,
  });
}
