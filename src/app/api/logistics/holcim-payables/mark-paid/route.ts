import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

/**
 * Маркиране на provisional purchase obligation на експортна доставка като ПЛАТЕНА/НЕПЛАТЕНА
 * към Holcim ПРЕДИ да има SupplierInvoice (§6/§7/§8). Финансово действие → manage_invoices.
 *
 * Сигурност/коректност (§15): server-side, company-scoped (IDOR), сумите НЕ идват от браузъра
 * (четат се snapshot-ите от DB). Транзакция + idempotent (повторно маркиране не удвоява нищо —
 * пази се само purchasePaidAt флаг, не се трупат Payment записи → без double counting, §6).
 * Допуска се само за НЕсвързани доставки (без SupplierInvoiceExportLink); свързаните минават
 * през плащания по фактурата (§10).
 */
const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  paid: z.boolean(),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { ids, paid } = schema.parse(await req.json());
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Четем САМО валидни цели: активната фирма, не изтрити, с purchase snapshot, БЕЗ фактура.
      const sets = await tx.exportDocumentSet.findMany({
        where: { id: { in: ids }, companyId: g.companyId, deletedAt: null, purchaseAmount: { not: null }, supplierInvoiceLinks: { none: {} } },
        select: { id: true, invoiceNumber: true, purchaseAmount: true, purchaseCurrency: true, purchasePaidAt: true },
      });
      // Idempotent: обновяваме само тези, чието състояние реално се променя.
      const toChange = sets.filter((s) => (s.purchasePaidAt != null) !== paid);
      if (toChange.length) {
        await tx.exportDocumentSet.updateMany({
          where: { id: { in: toChange.map((s) => s.id) }, companyId: g.companyId },
          data: paid ? { purchasePaidAt: now, purchasePaidById: g.userId } : { purchasePaidAt: null, purchasePaidById: null },
        });
      }
      return { matched: sets.length, changed: toChange.length, sets: toChange };
    });

    // Audit на всяка реална промяна (§13).
    for (const s of result.sets) {
      await audit(g.companyId, g.userId, paid ? "mark_paid" : "mark_unpaid", "ExportDocumentSet", s.id,
        `Доставка ${s.invoiceNumber}: ${s.purchasePaidAt != null ? "платена" : "неплатена"} → ${paid ? "платена" : "неплатена"} (${s.purchaseAmount == null ? "—" : Number(s.purchaseAmount)} ${s.purchaseCurrency ?? ""})`);
    }
    return NextResponse.json({ ok: true, matched: result.matched, changed: result.changed });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
