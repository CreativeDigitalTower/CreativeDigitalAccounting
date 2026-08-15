import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";

// Детайл с двупосочна traceability. Достъп: активната фирма е издател ИЛИ получател
// (двете са в една група; guard-ът гарантира достъп до модула).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const inv = await prisma.bgMkInvoice.findFirst({
    where: { id, OR: [{ companyId: g.companyId }, { counterpartyCompanyId: g.companyId }] },
    select: {
      id: true, number: true, date: true, currency: true, vatRate: true, note: true,
      companyId: true, counterpartyCompanyId: true,
      company: { select: { name: true } }, counterparty: { select: { name: true } },
      lines: {
        select: {
          id: true, productSnapshot: true, unit: true, quantity: true, unitPrice: true, lineTotal: true, vatAmount: true, grossAmount: true,
          shipment: {
            select: {
              id: true, code: true, dispatchNoteNumber: true,
              invoiceLinks: { select: { invoice: { select: { id: true, number: true } } } },
              proformaAllocation: { select: { proforma: { select: { number: true } } } },
            },
          },
        },
      },
    },
  });
  if (!inv) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

  const isIssuer = inv.companyId === g.companyId;
  const lines = inv.lines.map((l) => ({
    id: l.id, productSnapshot: l.productSnapshot, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice,
    lineTotal: l.lineTotal, vatAmount: l.vatAmount, grossAmount: l.grossAmount,
    trace: l.shipment ? {
      shipmentId: l.shipment.id, shipmentCode: l.shipment.code, dispatchNote: l.shipment.dispatchNoteNumber,
      holcimInvoice: l.shipment.invoiceLinks[0]?.invoice.number ?? null,
      holcimInvoiceId: l.shipment.invoiceLinks[0]?.invoice.id ?? null,
      proforma: l.shipment.proformaAllocation?.proforma.number ?? null,
    } : null,
  }));
  return NextResponse.json({
    id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, vatRate: inv.vatRate, note: inv.note,
    issuer: inv.company.name, recipient: inv.counterparty.name, direction: isIssuer ? "issued" : "received",
    net: sumMoney(lines.map((l) => l.lineTotal)), vat: sumMoney(lines.map((l) => l.vatAmount)), gross: sumMoney(lines.map((l) => l.grossAmount)),
    lines,
  });
}
