import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";
import { invoiceRemaining, paymentStatus } from "@/lib/logistics/holcimPayable";

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
          materialName: true, unit: true, productSnapshot: true, matchStatus: true,
          quantity: true, unitPrice: true, vatRate: true, lineTotal: true, vatAmount: true, grossAmount: true,
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
  // Плащания (§H) + свързани експортни доставки (§G/§J).
  const [payments, exportLinks] = await Promise.all([
    prisma.payment.findMany({ where: { companyId: g.companyId, direction: "out", documentId: id }, select: { id: true, amount: true, date: true, reason: true, note: true, method: true }, orderBy: { date: "asc" } }),
    prisma.supplierInvoiceExportLink.findMany({ where: { invoiceId: id }, select: { id: true, exportSet: { select: { id: true, invoiceNumber: true, destination: true, quantity: true, unit: true, purchaseAmount: true, purchaseCurrency: true } } } }),
  ]);
  const paid = sumMoney(payments.map((p) => p.amount));
  return NextResponse.json({
    ...inv, computed: { base, vat, total }, mismatch,
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    paid, remaining: invoiceRemaining(total, paid), paymentStatus: paymentStatus(total, paid),
    exportLinks: exportLinks.map((l) => ({ linkId: l.id, ...l.exportSet, purchaseAmount: l.exportSet.purchaseAmount == null ? null : Number(l.exportSet.purchaseAmount) })),
  });
}
