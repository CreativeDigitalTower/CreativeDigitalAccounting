import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";
import { buildPayableSummary, type PayableInvoice, type UninvoicedDelivery } from "@/lib/logistics/holcimPayable";

/**
 * KPI дашборд „Колко дължим на Holcim?" (§E). Реалните задължения идват от Holcim фактурите
 * (SupplierInvoice, с ДДС), платеното от Payment (direction out). Нефактурираните са
 * очакваните покупни стойности на доставки БЕЗ свързана фактура (double-counting защита, §F).
 * Сумите са ПО ВАЛУТА — без смесване (§E/§18).
 */
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;

  const [invoices, payments, uninvoiced] = await Promise.all([
    prisma.supplierInvoice.findMany({ where: { companyId: g.companyId }, select: { id: true, currency: true, links: { select: { grossAmount: true } } } }),
    prisma.payment.findMany({ where: { companyId: g.companyId, direction: "out", documentId: { not: null } }, select: { documentId: true, amount: true } }),
    // Доставки с покупна стойност, но БЕЗ свързана Holcim фактура → очаквано задължение.
    // purchasePaidAt → provisional платена (§6/§4).
    prisma.exportDocumentSet.findMany({
      where: { companyId: g.companyId, deletedAt: null, purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} } },
      select: { purchaseCurrency: true, purchaseAmount: true, purchasePaidAt: true },
    }),
  ]);

  const invoiceIds = new Set(invoices.map((i) => i.id));
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) if (p.documentId && invoiceIds.has(p.documentId)) paidByInvoice.set(p.documentId, sumMoney([paidByInvoice.get(p.documentId) ?? 0, p.amount]));

  const payableInvoices: PayableInvoice[] = invoices.map((i) => ({
    currency: i.currency || "EUR",
    total: sumMoney(i.links.map((l) => l.grossAmount)),
    paid: paidByInvoice.get(i.id) ?? 0,
  }));
  const uninvoicedDeliveries: UninvoicedDelivery[] = uninvoiced.map((d) => ({
    purchaseCurrency: d.purchaseCurrency, purchaseAmount: d.purchaseAmount == null ? null : Number(d.purchaseAmount), paid: d.purchasePaidAt != null,
  }));

  return NextResponse.json({ byCurrency: buildPayableSummary(payableInvoices, uninvoicedDeliveries) });
}
