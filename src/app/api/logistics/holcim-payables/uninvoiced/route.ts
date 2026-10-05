import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { sumMoney } from "@/lib/logistics/money";

/**
 * Разбивка на „Нефактурирани доставки" (§2) — РАЗБИВКАТА на KPI „Нефактурирани (очакват
 * Holcim фактура)". Ползва ТОЧНО СЪЩИЯ dataset като /holcim-payables (companyId, не изтрита,
 * purchaseAmount != null, БЕЗ свързана SupplierInvoice) → SUM(редове) == KPI (§1/§4).
 * Double counting е предотвратен от `supplierInvoiceLinks: { none: {} }` (§8). purchaseAmount
 * е SNAPSHOT (§C/PR #235) — НЕ се чете master цена. Totals/count са за ЦЕЛИЯ филтриран dataset,
 * не само текущата страница (§6). Валути не се смесват (§4). Company-scoped (IDOR).
 */
export async function GET(req: Request) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const product = (sp.get("product") ?? "").trim();
  const currency = (sp.get("currency") ?? "").trim();
  const sort = sp.get("sort") ?? "date_desc";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 25));
  const year = Number(sp.get("year")) || 0;
  const month = sp.get("month") != null ? Number(sp.get("month")) : NaN;
  let gte: Date | undefined, lte: Date | undefined;
  if (year) { gte = new Date(year, Number.isNaN(month) ? 0 : month, 1); lte = new Date(year, Number.isNaN(month) ? 12 : month + 1, 0, 23, 59, 59); }

  const where: Prisma.ExportDocumentSetWhereInput = {
    // ─ СЪЩИТЕ критерии като KPI „Нефактурирани" ─
    companyId: g.companyId, deletedAt: null, purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} },
    // ─ допълнителни филтри (само стесняват) ─
    ...(currency ? { purchaseCurrency: currency } : {}),
    ...(product ? { productSnapshot: { contains: product, mode: "insensitive" } } : {}),
    ...(gte || lte ? { invoiceDate: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    ...(q ? { OR: [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { productSnapshot: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  // Default sort = № доставка DESC (§2/§16). invoiceNumber е zero-padded фиксирана ширина →
  // лексикографското DESC съвпада с числовото.
  const orderBy: Prisma.ExportDocumentSetOrderByWithRelationInput =
    sort === "date_desc" ? { invoiceDate: "desc" }
    : sort === "date_asc" ? { invoiceDate: "asc" }
    : sort === "quantity" ? { quantity: "desc" }
    : sort === "amount" ? { purchaseAmount: "desc" }
    : { invoiceNumber: "desc" }; // invoice (default)

  const sel = { id: true, invoiceNumber: true, invoiceDate: true, productSnapshot: true, quantity: true, unit: true, purchaseUnitPrice: true, purchaseCurrency: true, purchaseAmount: true, purchasePaidAt: true } as const;

  const [total, all, pageRows] = await Promise.all([
    prisma.exportDocumentSet.count({ where }),
    // Леко извличане за totals по ЦЕЛИЯ филтриран dataset (не само страницата, §6/§16).
    prisma.exportDocumentSet.findMany({ where, select: { purchaseCurrency: true, purchaseAmount: true, quantity: true, purchasePaidAt: true } }),
    prisma.exportDocumentSet.findMany({ where, select: sel, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  // Totals ПО ВАЛУТА (Decimal, §4/§17) — без смесване, без FX. amount = общо; paidAmount =
  // provisional платено (§6); unpaidAmount = остатъкът.
  const byCurrency: Record<string, { amount: number; paidAmount: number; quantity: number; count: number }> = {};
  for (const d of all) {
    const cur = d.purchaseCurrency || "EUR";
    const r = byCurrency[cur] ?? { amount: 0, paidAmount: 0, quantity: 0, count: 0 };
    const amt = d.purchaseAmount == null ? 0 : Number(d.purchaseAmount);
    r.amount = sumMoney([r.amount, amt]);
    if (d.purchasePaidAt != null) r.paidAmount = sumMoney([r.paidAmount, amt]);
    r.quantity = Math.round((r.quantity + (d.quantity ?? 0)) * 1000) / 1000;
    r.count += 1;
    byCurrency[cur] = r;
  }

  const rows = pageRows.map((d) => ({
    id: d.id, invoiceNumber: d.invoiceNumber, date: d.invoiceDate?.toISOString() ?? null,
    product: d.productSnapshot, quantity: d.quantity, unit: d.unit,
    purchaseUnitPrice: d.purchaseUnitPrice == null ? null : Number(d.purchaseUnitPrice),
    purchaseCurrency: d.purchaseCurrency, purchaseAmount: d.purchaseAmount == null ? null : Number(d.purchaseAmount),
    paid: d.purchasePaidAt != null,
  }));

  return NextResponse.json({ rows, total, page, pageSize, totals: Object.entries(byCurrency).map(([currency, v]) => ({ currency, ...v, unpaidAmount: sumMoney([v.amount, -v.paidAmount]) })).sort((a, b) => a.currency.localeCompare(b.currency)) });
}
