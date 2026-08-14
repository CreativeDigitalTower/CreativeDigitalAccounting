import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const inv = await prisma.supplierInvoice.findFirst({
    where: { id, companyId: g.companyId },
    select: {
      id: true, number: true, date: true, taxEventDate: true, supplierId: true, currency: true, vatRate: true,
      paymentMethod: true, supplierSnapshot: true, recipientSnapshot: true, note: true,
      headerTaxBase: true, headerVatTotal: true, headerGrandTotal: true, originalFilename: true,
      links: {
        select: {
          id: true, lineNumber: true, dispatchNoteSnapshot: true, truckSnapshot: true, materialCodeSnapshot: true,
          productSnapshot: true, quantity: true, unitPrice: true, vatRate: true, lineTotal: true, vatAmount: true, grossAmount: true,
          shipment: { select: { id: true, code: true } },
        },
        orderBy: { lineNumber: "asc" },
      },
    },
  });
  if (!inv) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const base = sumMoney(inv.links.map((l) => l.lineTotal));
  const vat = sumMoney(inv.links.map((l) => l.vatAmount));
  const total = sumMoney(inv.links.map((l) => l.grossAmount));
  const mismatch = {
    base: inv.headerTaxBase != null && Math.abs(inv.headerTaxBase - base) > 0.01,
    vat: inv.headerVatTotal != null && Math.abs(inv.headerVatTotal - vat) > 0.01,
    total: inv.headerGrandTotal != null && Math.abs(inv.headerGrandTotal - total) > 0.01,
  };
  return NextResponse.json({ ...inv, computed: { base, vat, total }, mismatch });
}
