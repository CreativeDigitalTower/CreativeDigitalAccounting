/**
 * Сервиз за (ре)генериране на документните snapshot-и от централния ExportDocumentSet.
 * Единствен source на логиката — ползва се и от „Генерирай всички", и от promote-to-source.
 * Спазва snapshot/override архитектурата: finalized не се пипа, overridden — само при force.
 */
import { prisma } from "@/lib/prisma";
import { EXPORT_DOC_TYPES, ACTIVE_EXPORT_DOC_TYPES } from "@/lib/logistics/config";
import { buildDocumentData, shouldRegenerate } from "@/lib/logistics/exportDocs";
import { toExportParty, COMPANY_EXPORT_SELECT } from "@/lib/logistics/exportParty";

export type GenerateResult = { generated: string[]; skipped: string[] };

/**
 * Регенерира документите на даден set. `docTypes` по подразбиране са активните 5.
 * `force` презаписва overridden (но НИКОГА finalized). Връща какво е обновено/пропуснато.
 */
export async function regenerateSetDocuments(
  companyId: string, setId: string, actorId: string | null,
  opts: { force?: boolean; docTypes?: string[] } = {},
): Promise<GenerateResult | null> {
  const set = await prisma.exportDocumentSet.findFirst({
    where: { id: setId, companyId },
    select: {
      invoiceNumber: true, invoiceDate: true, destination: true, truckRegSnapshot: true, trailerReg: true,
      productSnapshot: true, quantity: true, unit: true, declarationCmrDate: true, dispatchNumber: true,
      logisticsProductId: true, buyerCompanyId: true, clientId: true,
      documents: { select: { docType: true, overridden: true, status: true } },
    },
  });
  if (!set) return null;

  const [seller, buyer, client, product] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: COMPANY_EXPORT_SELECT }),
    set.buyerCompanyId ? prisma.company.findUnique({ where: { id: set.buyerCompanyId }, select: COMPANY_EXPORT_SELECT }) : Promise.resolve(null),
    set.clientId ? prisma.client.findUnique({ where: { id: set.clientId }, select: { name: true, address: true, city: true, vatNumber: true, eik: true } }) : Promise.resolve(null),
    set.logisticsProductId ? prisma.logisticsProduct.findUnique({ where: { id: set.logisticsProductId }, select: { customsCode: true } }) : Promise.resolve(null),
  ]);

  const parties = {
    seller: toExportParty(seller),
    buyer: toExportParty(buyer),
    client: client ? { name: client.name, address: client.address, city: client.city, vatNumber: client.vatNumber, registrationNumber: client.eik } : null,
  };
  const src = {
    invoiceNumber: set.invoiceNumber, invoiceDate: set.invoiceDate?.toISOString() ?? null,
    destination: set.destination, truckRegSnapshot: set.truckRegSnapshot, trailerReg: set.trailerReg,
    productSnapshot: set.productSnapshot, customsCode: product?.customsCode ?? null,
    quantity: set.quantity, unit: set.unit, declarationCmrDate: set.declarationCmrDate?.toISOString() ?? null,
    dispatchNumber: set.dispatchNumber, holcimProforma: null as { number: string | null; date: string | null } | null,
  };

  const byType = new Map(set.documents.map((x) => [x.docType, x]));
  const targets = (opts.docTypes?.length ? opts.docTypes : [...ACTIVE_EXPORT_DOC_TYPES])
    .filter((t) => (EXPORT_DOC_TYPES as readonly string[]).includes(t));
  const generated: string[] = []; const skipped: string[] = [];

  for (const docType of targets) {
    if (!shouldRegenerate(byType.get(docType), !!opts.force)) { skipped.push(docType); continue; }
    const data = buildDocumentData(src, parties, docType as (typeof EXPORT_DOC_TYPES)[number]);
    await prisma.exportDocument.upsert({
      where: { setId_docType: { setId, docType } },
      create: { setId, docType, data: data as object, createdById: actorId },
      update: { data: data as object, overridden: false },
    });
    generated.push(docType);
  }
  return { generated, skipped };
}
