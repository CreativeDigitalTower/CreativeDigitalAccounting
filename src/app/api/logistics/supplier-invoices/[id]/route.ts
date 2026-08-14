import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { invoiceTotals } from "@/lib/logistics/purchaseCalc";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const inv = await prisma.supplierInvoice.findFirst({
    where: { id, companyId: g.companyId },
    select: {
      id: true, number: true, date: true, taxEventDate: true, supplierId: true, currency: true, vatRate: true, note: true,
      links: { select: { id: true, quantity: true, unitPrice: true, lineTotal: true, shipment: { select: { id: true, code: true, dispatchNoteNumber: true, vehicleRegSnapshot: true, productNameSnapshot: true } } } },
    },
  });
  if (!inv) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const totals = invoiceTotals(inv.links.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })), inv.vatRate);
  return NextResponse.json({ ...inv, ...totals });
}
