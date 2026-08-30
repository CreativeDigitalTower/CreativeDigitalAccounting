import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, inSameGroup } from "@/lib/logistics/access";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";

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
      destination: true, truckRegSnapshot: true, trailerReg: true, deletedAt: true,
    },
  });
  if (!set || set.deletedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (set.buyerCompanyId !== g.companyId || !(await inSameGroup(g.companyId, set.companyId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Дубликат (§22): вече издадена стандартна фактура или легаси MkInvoice за тази доставка.
  const [existingDoc, existingMk, company, bgClient, mkClients] = await Promise.all([
    prisma.document.findFirst({ where: { companyId: g.companyId, type: "invoice", sourceExportSetId: set.id, deletedAt: null, status: { not: "cancelled" } }, select: { id: true, number: true, status: true } }),
    prisma.mkInvoice.findFirst({ where: { companyId: g.companyId, sourceExportSetId: set.id, documentId: null }, select: { id: true, number: true } }),
    prisma.company.findUnique({ where: { id: g.companyId }, select: { defaultCurrency: true, defaultLanguage: true } }),
    set.clientId ? prisma.client.findUnique({ where: { id: set.clientId }, select: { companyId: true, name: true, eik: true, vatNumber: true, city: true, address: true, contactEmail: true } }) : Promise.resolve(null),
    prisma.client.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } }),
  ]);

  const existing = existingDoc
    ? { id: existingDoc.id, number: existingDoc.number, kind: "document" as const, status: existingDoc.status }
    : existingMk ? { id: existingMk.id, number: existingMk.number, kind: "mk" as const, status: "issued" } : null;

  // Краен клиент (§6/§13): match на BG-посочения клиент към собствен CRM клиент по име.
  const byNorm = new Map(mkClients.map((c) => [normalizeCompanyName(c.name), c.id]));
  // Ако крайният клиент вече е клиент на активната (MK) фирма — ползваме го директно (§8),
  // иначе fallback към match по нормализирано име (legacy BG клиент).
  const matchedClientId = bgClient
    ? (bgClient.companyId === g.companyId ? set.clientId : (byNorm.get(normalizeCompanyName(bgClient.name)) ?? null))
    : null;

  const refs = [
    `Логистична доставка: BG фактура ${set.invoiceNumber}`,
    [set.truckRegSnapshot, set.trailerReg].filter(Boolean).join(" / "),
    set.destination ? `Дестинация: ${set.destination}` : "",
  ].filter(Boolean).join(" · ");

  return NextResponse.json({
    sourceExportSetId: set.id,
    existing,
    matchedClientId,
    clientSnapshot: matchedClientId ? null : (bgClient ? { name: bgClient.name, eik: bgClient.eik ?? "", vatNumber: bgClient.vatNumber ?? "", city: bgClient.city ?? "", address: bgClient.address ?? "", contactEmail: bgClient.contactEmail ?? "" } : null),
    line: { description: set.productSnapshot ?? "", quantity: set.quantity ?? 0, unit: set.unit || "t", vatRate: MK_DEFAULT_VAT_RATE },
    currency: company?.defaultCurrency ?? "MKD",
    language: company?.defaultLanguage ?? undefined,
    notes: refs,
    bgInvoiceNumber: set.invoiceNumber,
    shipmentDate: set.shipmentDate?.toISOString() ?? set.invoiceDate?.toISOString() ?? null,
  });
}
