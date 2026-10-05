import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, inSameGroup } from "@/lib/logistics/access";
import { generateDocumentNumber, isNumberTaken, advanceInvoiceSequence, audit } from "@/lib/documents";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { invoicedSetIds } from "@/lib/logistics/deliveryInvoice";
import { MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { z } from "zod";

/**
 * BULK MK фактуриране (§5/§12/§19): N получени доставки за ЕДИН краен клиент → ЕДНА обща
 * фактура (Document) с по един ред на доставка + MkInvoiceDeliveryLink за всяка.
 *
 * Сигурност/коректност: SEM company scope (buyer), same-client HARD rule (canonical client ID,
 * §3/§4) — re-валидира се server-side; no double invoicing (§13/§20) чрез проверка + @unique
 * на линка; суми/VAT server-side с Decimal (§11/§26, цените НЕ се вярват сляпо — количеството
 * идва от snapshot-а в DB, продажната цена е въведена от потребителя както в single flow, §10);
 * всичко в една транзакция (§19).
 */
const schema = z.object({
  clientId: z.string().min(1),
  currency: z.string().min(1).max(8),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  language: z.string().max(8).nullable().optional(),
  paymentMethod: z.string().max(60).nullable().optional(),
  issueDate: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  notes: z.string().max(4000).nullable().optional(),
  lines: z.array(z.object({ exportSetId: z.string().min(1), unitPrice: z.number().min(0) })).min(1).max(200),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    const setIds = d.lines.map((l) => l.exportSetId);
    if (new Set(setIds).size !== setIds.length) return NextResponse.json({ error: "Дублирана доставка в заявката." }, { status: 400 });

    // Клиентът (bill-to) трябва да е CRM клиент на АКТИВНАТА (SEM) фирма (§7/§26).
    const client = await prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true, name: true, eik: true, vatNumber: true, city: true, address: true, country: true, mol: true } });
    if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });

    // Re-fetch на доставките (§19): company scope = получателят; в групата; не изтрити.
    const sets = await prisma.exportDocumentSet.findMany({
      where: { id: { in: setIds }, buyerCompanyId: g.companyId, deletedAt: null },
      select: { id: true, invoiceNumber: true, companyId: true, clientId: true, productSnapshot: true, quantity: true, unit: true },
    });
    if (sets.length !== setIds.length) return NextResponse.json({ error: "Една или повече доставки не са намерени." }, { status: 404 });
    for (const s of sets) if (!(await inSameGroup(g.companyId, s.companyId))) return NextResponse.json({ error: "Доставка извън бизнес групата." }, { status: 403 });

    // SAME-CLIENT HARD RULE (§3/§4): канонична идентичност == избрания клиент.
    const bgIds = [...new Set(sets.map((s) => s.clientId).filter((x): x is string => !!x))];
    const bgClients = bgIds.length ? await prisma.client.findMany({ where: { id: { in: bgIds } }, select: { id: true, name: true, companyId: true } }) : [];
    const bgById = new Map(bgClients.map((c) => [c.id, c]));
    const semClients = await prisma.client.findMany({ where: { companyId: g.companyId }, select: { id: true, name: true } });
    const semByNorm = new Map(semClients.map((c) => [normalizeCompanyName(c.name), c.id]));
    const finalClientIdFor = (cid: string | null): string | null => {
      if (!cid) return null;
      const c = bgById.get(cid);
      if (!c) return null;
      return c.companyId === g.companyId ? cid : (semByNorm.get(normalizeCompanyName(c.name)) ?? null);
    };
    for (const s of sets) {
      if (finalClientIdFor(s.clientId) !== d.clientId) {
        return NextResponse.json({ error: "Всички доставки трябва да са към един и същ краен клиент." }, { status: 400 });
      }
    }

    // NO DOUBLE INVOICING (§13): нито една вече фактурирана (линк/легаси/MkInvoice).
    const already = await invoicedSetIds(g.companyId, setIds);
    if (already.size > 0) return NextResponse.json({ error: "Една или повече от избраните доставки вече са фактурирани.", invoiced: [...already] }, { status: 409 });

    const vatRate = d.vatRate ?? MK_DEFAULT_VAT_RATE;
    const setById = new Map(sets.map((s) => [s.id, s]));
    // Редове server-side: количество от snapshot, цена от вход (§10). Decimal (§11).
    const lines = d.lines.map((l) => {
      const s = setById.get(l.exportSetId)!;
      const qty = s.quantity ?? 0;
      const fin = lineFinancials(qty, l.unitPrice, vatRate);
      return { exportSetId: s.id, description: `${s.productSnapshot ?? ""} · BG фактура №${s.invoiceNumber}`.trim(), quantity: qty, unit: s.unit || "t", unitPrice: l.unitPrice, vatRate, lineTotal: fin.gross };
    });
    const subtotal = sumMoney(d.lines.map((l) => { const s = setById.get(l.exportSetId)!; return lineFinancials(s.quantity ?? 0, l.unitPrice, vatRate).net; }));

    // Атомарно създаване + линкове + номер (§19/§20). Serializable + retry при конфликт.
    let created: { id: string; number: string } | null = null;
    let numberTaken = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await prisma.$transaction(async (tx) => {
          const num = await generateDocumentNumber(g.companyId, "invoice", tx);
          if (await isNumberTaken(g.companyId, num, undefined, tx)) throw { __retry: true };
          const doc = await tx.document.create({
            data: {
              companyId: g.companyId, type: "invoice", number: num, clientId: d.clientId,
              issueDate: d.issueDate ? new Date(d.issueDate) : new Date(),
              currency: d.currency, language: d.language ?? undefined, paymentMethod: d.paymentMethod ?? "bank_transfer",
              notes: d.notes ?? null, status: "issued",
              lines: { create: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal })) },
            },
            select: { id: true, number: true },
          });
          // Линкове (§12/§13): @unique(exportSetId) → при concurrent дубликат → P2002 → 409.
          await tx.mkInvoiceDeliveryLink.createMany({ data: lines.map((l) => ({ documentId: doc.id, exportSetId: l.exportSetId, createdById: g.userId })) });
          await advanceInvoiceSequence(tx, g.companyId, num);
          return doc;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        created = res; break;
      } catch (e) {
        const err = e as { __retry?: boolean; code?: string };
        if (err.code === "P2002") return NextResponse.json({ error: "Една или повече от избраните доставки вече са фактурирани." }, { status: 409 });
        if ((err.__retry || err.code === "P2034") && attempt < 4) continue;
        throw e;
      }
    }
    if (!created) { numberTaken = true; }
    if (numberTaken || !created) return NextResponse.json({ error: "Неуспешно генериране на номер, опитайте отново." }, { status: 409 });

    await audit(g.companyId, g.userId, "create", "Document", created.id,
      `Обща MK фактура ${created.number} за ${client.name}: ${lines.length} доставки (${sets.map((s) => s.invoiceNumber).join(", ")}), субтотал ${subtotal} ${d.currency}`);
    return NextResponse.json({ ok: true, id: created.id, number: created.number });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
