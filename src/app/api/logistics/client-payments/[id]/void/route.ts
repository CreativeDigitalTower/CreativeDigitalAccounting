import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { recomputeInvoice } from "@/lib/logistics/receivablesDb";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1).max(500) });

/**
 * Анулиране на плащане (§9). Безопасно: плащането ОСТАВА в историята (status=voided + кой/
 * кога/защо); разпределенията му се сторнират (изтриват) и засегнатите фактури се
 * преизчисляват. Ако кредит от това плащане е бил приложен към по-късни фактури, неговите
 * разпределения са СЪЩО негови → сторнират се заедно (без неконсистентност). Транзакционно.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const { reason } = schema.parse(await req.json());
    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.clientPayment.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true, allocations: { select: { documentId: true } } } });
      if (!pay) return { notFound: true as const };
      if (pay.status === "voided") return { already: true as const };
      const docIds = [...new Set(pay.allocations.map((a) => a.documentId))];
      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
      await tx.clientPayment.update({ where: { id }, data: { status: "voided", voidedAt: new Date(), voidedById: g.userId, voidReason: reason } });
      for (const docId of docIds) await recomputeInvoice(tx, g.companyId, docId);
      return { affected: docIds.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ("notFound" in result) return NextResponse.json({ error: "Плащането не е намерено." }, { status: 404 });
    if ("already" in result) return NextResponse.json({ error: "Плащането вече е анулирано." }, { status: 409 });
    await audit(g.companyId, g.userId, "payment_void", "ClientPayment", id, `Анулирано плащане (причина: ${reason}); сторнирани ${result.affected} фактури`);
    return NextResponse.json({ ok: true, affected: result.affected });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Изисква се причина за анулиране." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
