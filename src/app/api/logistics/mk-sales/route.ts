import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatMkNumber, MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { canSellQuantity } from "@/lib/logistics/inventory";
import { z } from "zod";

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.mkInvoice.findMany({
    where: { companyId: g.companyId },
    select: { id: true, number: true, date: true, currency: true, client: { select: { name: true } }, lines: { select: { lineTotal: true, grossAmount: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map((inv) => ({
    id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, client: inv.client?.name ?? "—",
    lines: inv.lines.length, net: sumMoney(inv.lines.map((l) => l.lineTotal)), gross: sumMoney(inv.lines.map((l) => l.grossAmount)),
  })));
}

const schema = z.object({
  clientId: z.string().nullable().optional(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  currency: z.string().max(8).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  lines: z.array(z.object({
    sourceBgMkLineId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    if (d.clientId) {
      const client = await prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true } });
      if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
    }
    const currency = d.currency || "MKD";
    const vatRate = d.vatRate ?? MK_DEFAULT_VAT_RATE; // default MK ДДВ (конфигурируемо)
    const year = (d.date ? new Date(d.date) : new Date()).getFullYear();

    // Кумулативно търсене на количество по източник в рамките на заявката.
    const perSource = new Map<string, number>();
    for (const l of d.lines) perSource.set(l.sourceBgMkLineId, (perSource.get(l.sourceBgMkLineId) ?? 0) + l.quantity);

    try {
      const invoice = await prisma.$transaction(async (tx) => {
        // Проверка на всеки източник: собственост (inventory на MK) + наличен остатък.
        for (const [sourceId, wanted] of perSource) {
          const src = await tx.bgMkInvoiceLine.findFirst({
            where: { id: sourceId, invoice: { counterpartyCompanyId: g.companyId } },
            select: { id: true, quantity: true, mkAllocations: { select: { quantity: true } } },
          });
          if (!src) throw new Error("SRC_NOT_FOUND");
          const chk = canSellQuantity(src.quantity, src.mkAllocations.map((a) => a.quantity), wanted);
          if (!chk.ok) throw new Error(`OVERSELL:${sourceId}:${chk.remaining}`);
        }

        const val = await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.mkInvoice, { year });
        const number = formatMkNumber(year, val);
        const inv = await tx.mkInvoice.create({
          data: { companyId: g.companyId, clientId: d.clientId || null, number, date: d.date ? new Date(d.date) : new Date(), currency, vatRate, note: d.note ?? null, createdById: g.userId },
          select: { id: true, number: true },
        });
        for (const l of d.lines) {
          const src = await tx.bgMkInvoiceLine.findUnique({ where: { id: l.sourceBgMkLineId }, select: { productSnapshot: true, unit: true } });
          const fin = lineFinancials(l.quantity, l.unitPrice, vatRate);
          await tx.mkInvoiceLine.create({
            data: {
              invoiceId: inv.id, sourceBgMkLineId: l.sourceBgMkLineId, productSnapshot: src?.productSnapshot ?? null, unit: src?.unit ?? "t",
              quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: fin.net, vatAmount: fin.vat, grossAmount: fin.gross, currency,
            },
          });
        }
        return inv;
      }, { isolationLevel: "Serializable" });

      await audit(g.companyId, g.userId, "create", "MkInvoice", invoice.id, `MK продажба ${invoice.number} (${d.lines.length} позиции)`);
      return NextResponse.json({ id: invoice.id, number: invoice.number });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SRC_NOT_FOUND") return NextResponse.json({ error: "Източник от inventory не е намерен." }, { status: 404 });
      if (msg.startsWith("OVERSELL:")) {
        const remaining = msg.split(":")[2];
        return NextResponse.json({ error: `Недостатъчно налично количество (остатък: ${remaining}).`, remaining: Number(remaining) }, { status: 409 });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2002")) {
        return NextResponse.json({ error: "Едновременна операция — опитайте отново." }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
