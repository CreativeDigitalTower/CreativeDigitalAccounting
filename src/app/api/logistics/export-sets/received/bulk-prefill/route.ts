import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, inSameGroup } from "@/lib/logistics/access";
import { MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { getDefaultDocumentLanguage } from "@/lib/constants";
import { invoicedSetIds, resolveFinalClientIds, loadBuyerPrefill } from "@/lib/logistics/deliveryInvoice";

/**
 * Prefill за СТАНДАРТНАТА форма „Нова фактура" от НЯКОЛКО получени доставки (§3/§4/§5).
 * Само данни — не създава нищо (създаването е стандартният POST /api/documents със
 * sourceExportSetIds, §10). Валидира: SEM е получател, същата бизнес група, един и същ
 * краен клиент (canonical ID), нито една вече фактурирана. Връща редове (по един на доставка),
 * canonical клиент и контекст за информационния блок (§21).
 */
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (ids.length === 0) return NextResponse.json({ error: "no_ids" }, { status: 400 });

  const sets = await prisma.exportDocumentSet.findMany({
    where: { id: { in: ids }, buyerCompanyId: g.companyId, deletedAt: null },
    select: { id: true, invoiceNumber: true, companyId: true, clientId: true, productSnapshot: true, quantity: true, unit: true, shipmentDate: true, invoiceDate: true },
  });
  if (sets.length !== ids.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  for (const s of sets) if (!(await inSameGroup(g.companyId, s.companyId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Един и същ каноничен краен клиент (§3/§4).
  const finalByset = await resolveFinalClientIds(g.companyId, sets);
  const clientIds = [...new Set([...finalByset.values()])];
  if (clientIds.length !== 1 || clientIds[0] == null) return NextResponse.json({ error: "client_mismatch" }, { status: 400 });
  const clientId = clientIds[0] as string;

  // Нито една вече фактурирана (§13).
  const already = await invoicedSetIds(g.companyId, ids);
  if (already.size > 0) return NextResponse.json({ error: "already_invoiced", invoiced: [...already] }, { status: 409 });

  const [company, buyer] = await Promise.all([
    prisma.company.findUnique({ where: { id: g.companyId }, select: { defaultCurrency: true, defaultLanguage: true, countryCode: true } }),
    loadBuyerPrefill(g.companyId, clientId),
  ]);

  // Подреждаме по № фактура/доставка DESC (консистентно с останалите логистични списъци).
  const ordered = [...sets].sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
  const lines = ordered.map((s) => ({
    description: `${s.productSnapshot ?? ""} / доставка №${s.invoiceNumber}`.trim(),
    quantity: s.quantity ?? 0, unit: s.unit || "t", vatRate: MK_DEFAULT_VAT_RATE,
  }));
  const totalQuantity = Math.round(ordered.reduce((a, s) => a + (s.quantity ?? 0), 0) * 1000) / 1000;

  return NextResponse.json({
    sourceExportSetIds: ordered.map((s) => s.id),
    matchedClientId: clientId,
    clientName: buyer?.name ?? null,
    buyer, // единен authoritative buyer billing обект (§8) — city/mol/address включени
    lines,
    currency: company?.defaultCurrency ?? "MKD",
    language: getDefaultDocumentLanguage(company),
    notes: `Логистични доставки: ${ordered.map((s) => s.invoiceNumber).join(", ")}`,
    context: { count: ordered.length, totalQuantity, unit: ordered[0]?.unit || "t", sourceNumbers: ordered.map((s) => s.invoiceNumber) },
  });
}
