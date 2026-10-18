import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, inSameGroup } from "@/lib/logistics/access";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { getDefaultDocumentLanguage } from "@/lib/constants";
import { loadDeliveryInvoiceMap, loadBuyerPrefill } from "@/lib/logistics/deliveryInvoice";

// Prefill за СТАНДАРТНАТА фактура (Document) от получена BG→MK доставка (§4/§7/§40).
// Само данни — не създава нищо. Създаването минава през стандартния POST /api/documents
// с подадено sourceExportSetId. Security: активната фирма трябва да е получателят (buyer)
// в същата CompanyGroup (§35).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;

  const set = await prisma.exportDocumentSet.findUnique({
    where: { id },
    select: {
      id: true, companyId: true, buyerCompanyId: true, clientId: true, invoiceNumber: true,
      invoiceDate: true, shipmentDate: true, productSnapshot: true, quantity: true, unit: true,
      destination: true, truckRegSnapshot: true, trailerReg: true, deletedAt: true, logisticsProductId: true,
    },
  });
  if (!set || set.deletedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (set.buyerCompanyId !== g.companyId || !(await inSameGroup(g.companyId, set.companyId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Дубликат (§22): вече издадена фактура (bulk link / легаси source / легаси MkInvoice).
  const [invMap, company, bgClient, mkClients] = await Promise.all([
    loadDeliveryInvoiceMap(g.companyId, [set.id]),
    prisma.company.findUnique({ where: { id: g.companyId }, select: { defaultCurrency: true, defaultLanguage: true, countryCode: true } }),
    set.clientId ? prisma.client.findUnique({ where: { id: set.clientId }, select: { companyId: true, name: true, eik: true, vatNumber: true, city: true, address: true, mol: true, country: true, contactEmail: true } }) : Promise.resolve(null),
    prisma.client.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } }),
  ]);

  const resolved = invMap.get(set.id) ?? null;
  const existing = resolved ? { id: resolved.id, number: resolved.number, kind: resolved.kind ?? "document", status: "issued" } : null;

  // Краен клиент (§6/§13): match на BG-посочения клиент към собствен CRM клиент по име.
  const byNorm = new Map(mkClients.map((c) => [normalizeCompanyName(c.name), c.id]));
  // Ако крайният клиент вече е клиент на активната (MK) фирма — ползваме го директно (§8),
  // иначе fallback към match по нормализирано име (legacy BG клиент).
  const matchedClientId = bgClient
    ? (bgClient.companyId === g.companyId ? set.clientId : (byNorm.get(normalizeCompanyName(bgClient.name)) ?? null))
    : null;

  // Единен authoritative buyer обект (§4/§5/§8): CRM клиент (ако е match-нат) ИЛИ snapshot на
  // BG-посочения клиент. Градът идва от Client.city (НЕ от адрес/дестинация, §6).
  const buyer = matchedClientId
    ? await loadBuyerPrefill(g.companyId, matchedClientId)
    : (bgClient ? { id: null, name: bgClient.name, eik: bgClient.eik ?? "", vatNumber: bgClient.vatNumber ?? "", city: bgClient.city ?? "", address: bgClient.address ?? "", mol: bgClient.mol ?? "", country: bgClient.country ?? "", contactEmail: bgClient.contactEmail ?? "" } : null);

  const refs = [
    `Логистична доставка: BG фактура ${set.invoiceNumber}`,
    [set.truckRegSnapshot, set.trailerReg].filter(Boolean).join(" / "),
    set.destination ? `Дестинация: ${set.destination}` : "",
  ].filter(Boolean).join(" · ");

  // Ориентировъчна продажна цена за MK клиенти (§3). Само в MKD фактура (§9) — за друга
  // валута НЕ пренасяме MKD число. Празна цена → unitPrice null (ръчно въвеждане, §6).
  const currency = company?.defaultCurrency ?? "MKD";
  const prod = set.logisticsProductId
    ? await prisma.logisticsProduct.findFirst({ where: { id: set.logisticsProductId, companyId: g.companyId }, select: { salePriceMk: true } })
    : null;
  const unitPrice = currency === "MKD" && prod?.salePriceMk != null ? Number(prod.salePriceMk) : null;

  return NextResponse.json({
    sourceExportSetId: set.id,
    existing,
    matchedClientId,
    buyer, // единен authoritative buyer billing обект (§8) — формата го ползва директно
    clientSnapshot: matchedClientId ? null : (bgClient ? { name: bgClient.name, eik: bgClient.eik ?? "", vatNumber: bgClient.vatNumber ?? "", city: bgClient.city ?? "", address: bgClient.address ?? "", contactEmail: bgClient.contactEmail ?? "" } : null),
    line: { description: set.productSnapshot ?? "", quantity: set.quantity ?? 0, unit: set.unit || "t", vatRate: MK_DEFAULT_VAT_RATE, unitPrice },
    currency,
    language: getDefaultDocumentLanguage(company),
    notes: refs,
    bgInvoiceNumber: set.invoiceNumber,
    shipmentDate: set.shipmentDate?.toISOString() ?? set.invoiceDate?.toISOString() ?? null,
  });
}
