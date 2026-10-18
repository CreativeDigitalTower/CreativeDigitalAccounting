import { prisma } from "@/lib/prisma";
import { resolveReceivedInvoice, type ReceivedMkInvoice } from "@/lib/logistics/received";
import { normalizeCompanyName } from "@/lib/logistics/normalize";

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

export type BuyerPrefill = {
  id: string | null; name: string; eik: string; vatNumber: string; city: string;
  address: string; mol: string; country: string; contactEmail: string;
};

/**
 * Пълните billing данни на крайния клиент за prefill на фактурата (§4/§5/§8). Единен
 * authoritative източник за single и bulk flow. `id` е CRM Client id (за селектора/snapshot),
 * null → ръчни данни. Градът идва от Client.city (НЕ от адрес/дестинация, §6). Unicode-safe.
 */
export async function loadBuyerPrefill(companyId: string, clientId: string): Promise<BuyerPrefill | null> {
  const c = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: { id: true, name: true, eik: true, vatNumber: true, city: true, address: true, mol: true, country: true, contactEmail: true },
  });
  if (!c) return null;
  return {
    id: c.id, name: c.name, eik: c.eik ?? "", vatNumber: c.vatNumber ?? "", city: c.city ?? "",
    address: c.address ?? "", mol: c.mol ?? "", country: c.country ?? "", contactEmail: c.contactEmail ?? "",
  };
}

/** Множество от exportSetId, които ВЕЧЕ са фактурирани (за блокиране на повторно фактуриране). */
export async function invoicedSetIds(companyId: string, setIds: string[]): Promise<Set<string>> {
  const map = await loadDeliveryInvoiceMap(companyId, setIds);
  return new Set(map.keys());
}

/**
 * Канонична идентичност на крайния клиент (SEM CRM client id) за всяка получена доставка (§4):
 * ако доставката вече сочи CRM клиент на активната (MK) фирма → него; иначе match по
 * нормализирано име към CRM клиент на фирмата. ID, не fuzzy име. Връща Map<setId, clientId|null>.
 * Доставките трябва да са на активната фирма като получател (buyerCompanyId === companyId).
 */
export async function resolveFinalClientIds(companyId: string, sets: { id: string; clientId: string | null }[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const bgIds = [...new Set(sets.map((s) => s.clientId).filter((x): x is string => !!x))];
  const [bgClients, semClients] = await Promise.all([
    bgIds.length ? prisma.client.findMany({ where: { id: { in: bgIds } }, select: { id: true, name: true, companyId: true } }) : Promise.resolve([]),
    prisma.client.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  const bgById = new Map(bgClients.map((c) => [c.id, c]));
  const semByNorm = new Map(semClients.map((c) => [normalizeCompanyName(c.name), c.id]));
  for (const s of sets) {
    if (!s.clientId) { out.set(s.id, null); continue; }
    const c = bgById.get(s.clientId);
    out.set(s.id, c ? (c.companyId === companyId ? s.clientId : (semByNorm.get(normalizeCompanyName(c.name)) ?? null)) : null);
  }
  return out;
}
