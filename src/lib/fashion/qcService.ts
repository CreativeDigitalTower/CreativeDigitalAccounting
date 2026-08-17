/**
 * Преизчислява броевете на производствената поръчка от източника (QC минавания +
 * дефекти). Извиква се в транзакция след всяка QC мутация → idempotent (без drift).
 */
import { Prisma } from "@prisma/client";
import { computeOrderCounts } from "@/lib/fashion/qc";

export async function recomputeOrderCounts(tx: Prisma.TransactionClient, companyId: string, orderId: string): Promise<void> {
  const [records, defects] = await Promise.all([
    tx.fashionQcRecord.findMany({ where: { companyId, productionOrderId: orderId }, select: { goodQty: true } }),
    tx.fashionDefect.findMany({ where: { companyId, productionOrderId: orderId }, select: { quantity: true, disposition: true } }),
  ]);
  const goodQty = records.reduce((s, r) => s + r.goodQty, 0);
  const counts = computeOrderCounts(goodQty, defects);
  await tx.fashionProductionOrder.update({
    where: { id: orderId },
    data: { qtyGood: counts.good, qtyDefective: counts.defective, qtyRepair: counts.repair, qtyReady: counts.ready },
  });
}
