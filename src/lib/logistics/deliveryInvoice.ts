import { prisma } from "@/lib/prisma";
import { resolveReceivedInvoice, type ReceivedMkInvoice } from "@/lib/logistics/received";

/**
 * Канонична резолюция „коя MK фактура покрива дадена получена доставка" (§12/§13).
 * Три източника (приоритет Document):
 *   1) MkInvoiceDeliveryLink → bulk обща фактура (Document) за N доставки;
 *   2) Document.sourceExportSetId → легаси single-delivery фактура (Document);
 *   3) легаси MkInvoice.sourceExportSetId (operational ledger).
 * Валидни = не изтрити и не анулирани. Company-scoped (`companyId` = получателят/SEM).
 * Връща Map<exportSetId, {id, number, kind}>.
 */
export async function loadDeliveryInvoiceMap(companyId: string, setIds: string[]): Promise<Map<string, NonNullable<ReceivedMkInvoice>>> {
  const out = new Map<string, NonNullable<ReceivedMkInvoice>>();
  if (setIds.length === 0) return out;

  const [links, docsBySource, legacyMk] = await Promise.all([
    prisma.mkInvoiceDeliveryLink.findMany({
      where: { exportSetId: { in: setIds }, document: { companyId, type: "invoice", deletedAt: null, status: { not: "cancelled" } } },
      select: { exportSetId: true, document: { select: { id: true, number: true } } },
    }),
    prisma.document.findMany({
      where: { companyId, type: "invoice", sourceExportSetId: { in: setIds }, deletedAt: null, status: { not: "cancelled" } },
      select: { id: true, number: true, sourceExportSetId: true },
    }),
    prisma.mkInvoice.findMany({
      where: { companyId, sourceExportSetId: { in: setIds } },
      select: { id: true, number: true, sourceExportSetId: true, documentId: true },
    }),
  ]);

  const linkBySet = new Map(links.map((l) => [l.exportSetId, l.document]));
  const docBySet = new Map(docsBySource.filter((d) => d.sourceExportSetId).map((d) => [d.sourceExportSetId as string, { id: d.id, number: d.number }]));
  const mkBySet = new Map(legacyMk.filter((m) => m.sourceExportSetId).map((m) => [m.sourceExportSetId as string, { id: m.id, number: m.number, documentId: m.documentId }]));

  for (const setId of setIds) {
    // Bulk link или source → и двете са Document (kind document); иначе легаси MkInvoice.
    const doc = linkBySet.get(setId) ?? docBySet.get(setId) ?? null;
    const resolved = resolveReceivedInvoice(doc, mkBySet.get(setId) ?? null);
    if (resolved) out.set(setId, resolved);
  }
  return out;
}

/** Множество от exportSetId, които ВЕЧЕ са фактурирани (за блокиране на повторно фактуриране). */
export async function invoicedSetIds(companyId: string, setIds: string[]): Promise<Set<string>> {
  const map = await loadDeliveryInvoiceMap(companyId, setIds);
  return new Set(map.keys());
}
