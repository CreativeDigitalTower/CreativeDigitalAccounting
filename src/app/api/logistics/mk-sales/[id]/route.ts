import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";

// Детайл на MK продажба с пълна traceability назад до Holcim/проформа/бележка.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const inv = await prisma.mkInvoice.findFirst({
    where: { id, companyId: g.companyId },
    select: {
      id: true, number: true, date: true, currency: true, vatRate: true, note: true,
      client: { select: { name: true } },
      // Директен източник: получената BG→MK доставка, от която е издадена (§18).
      sourceExportSet: { select: { id: true, invoiceNumber: true, destination: true, truckRegSnapshot: true, trailerReg: true } },
      lines: {
        select: {
          id: true, productSnapshot: true, unit: true, quantity: true, unitPrice: true, lineTotal: true, vatAmount: true, grossAmount: true,
          source: {
            select: {
              invoice: { select: { id: true, number: true } },
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
      },
    },
  });
  if (!inv) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

  const lines = inv.lines.map((l) => ({
    id: l.id, productSnapshot: l.productSnapshot, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice,
    lineTotal: l.lineTotal, vatAmount: l.vatAmount, grossAmount: l.grossAmount,
    trace: l.source ? {
      bgMkInvoiceId: l.source.invoice.id, bgMkInvoice: l.source.invoice.number,
      shipmentId: l.source.shipment?.id ?? null, shipmentCode: l.source.shipment?.code ?? null, dispatchNote: l.source.shipment?.dispatchNoteNumber ?? null,
      holcimInvoiceId: l.source.shipment?.invoiceLinks[0]?.invoice.id ?? null, holcimInvoice: l.source.shipment?.invoiceLinks[0]?.invoice.number ?? null,
      proforma: l.source.shipment?.proformaAllocation?.proforma.number ?? null,
    } : null,
  }));
  return NextResponse.json({
    id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, vatRate: inv.vatRate, note: inv.note,
    client: inv.client?.name ?? "—",
    sourceExportSet: inv.sourceExportSet ? {
      id: inv.sourceExportSet.id, invoiceNumber: inv.sourceExportSet.invoiceNumber, destination: inv.sourceExportSet.destination,
      truck: [inv.sourceExportSet.truckRegSnapshot, inv.sourceExportSet.trailerReg].filter(Boolean).join(" / ") || null,
    } : null,
    net: sumMoney(lines.map((l) => l.lineTotal)), vat: sumMoney(lines.map((l) => l.vatAmount)), gross: sumMoney(lines.map((l) => l.grossAmount)),
    lines,
  });
}
