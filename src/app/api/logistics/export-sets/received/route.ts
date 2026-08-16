import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";

// Споделена intercompany visibility: export set-ове, в които АКТИВНАТА фирма е купувач
// (MK), издадени от продавач (BG) в същата бизнес група. Read-only, без дублиране.
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;

  const me = await prisma.company.findUnique({ where: { id: g.companyId }, select: { companyGroupId: true } });
  if (!me?.companyGroupId) return NextResponse.json([]);

  const sets = await prisma.exportDocumentSet.findMany({
    where: { buyerCompanyId: g.companyId, company: { companyGroupId: me.companyGroupId } },
    select: {
      id: true, invoiceNumber: true, invoiceDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
      productSnapshot: true, quantity: true, unit: true, status: true, companyId: true,
      documents: { select: { docType: true, status: true } },
    },
    orderBy: { createdAt: "desc" }, take: 500,
  });

  const sellerIds = [...new Set(sets.map((s) => s.companyId))];
  const sellers = sellerIds.length ? await prisma.company.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true } }) : [];
  const sellerName = new Map(sellers.map((c) => [c.id, c.name]));

  const rows = sets.map(({ companyId, ...s }) => ({ ...s, seller: sellerName.get(companyId) ?? null }));
  return NextResponse.json(rows);
}
