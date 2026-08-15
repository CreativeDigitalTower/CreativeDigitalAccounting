import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, groupCounterparties } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatBgMkNumber } from "@/lib/logistics/config";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { z } from "zod";

// Списък: издадени (BG страна, companyId = active) + получени (MK страна, counterparty).
export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const [issued, received] = await Promise.all([
    prisma.bgMkInvoice.findMany({
      where: { companyId: g.companyId },
      select: { id: true, number: true, date: true, currency: true, counterparty: { select: { name: true } }, lines: { select: { lineTotal: true, grossAmount: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bgMkInvoice.findMany({
      where: { counterpartyCompanyId: g.companyId },
      select: { id: true, number: true, date: true, currency: true, company: { select: { name: true } }, lines: { select: { lineTotal: true, grossAmount: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const map = (inv: { id: string; number: string; date: Date | null; currency: string; lines: { lineTotal: number; grossAmount: number | null }[] }, party: string, dir: "issued" | "received") =>
    ({ id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, party, direction: dir, lines: inv.lines.length, net: sumMoney(inv.lines.map((l) => l.lineTotal)), gross: sumMoney(inv.lines.map((l) => l.grossAmount)) });
  return NextResponse.json({
    issued: issued.map((i) => map(i, i.counterparty.name, "issued")),
    received: received.map((i) => map(i, i.company.name, "received")),
  });
}

const schema = z.object({
  counterpartyCompanyId: z.string(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  lines: z.array(z.object({
    shipmentId: z.string(),
    unitPrice: z.number().nonnegative(),
    quantity: z.number().positive().nullable().optional(),
  })).min(1),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    // Получателят трябва да е член на същата бизнес група (срещу произволни фирми).
    const counterparties = await groupCounterparties(g.companyId);
    if (!counterparties.some((c) => c.id === d.counterpartyCompanyId)) {
      return NextResponse.json({ error: "Получателят не е свързана фирма от групата." }, { status: 400 });
    }

    const ids = d.lines.map((l) => l.shipmentId);
    const shipments = await prisma.shipment.findMany({
      where: { id: { in: ids }, companyId: g.companyId, deletedAt: null },
      select: { id: true, productId: true, productNameSnapshot: true, netQuantity: true, unit: true, bgMkLine: { select: { id: true } } },
    });
    if (shipments.length !== ids.length) return NextResponse.json({ error: "Някой курс не е намерен." }, { status: 404 });
    const byId = new Map(shipments.map((s) => [s.id, s]));
    for (const l of d.lines) {
      const s = byId.get(l.shipmentId)!;
      if (s.bgMkLine) return NextResponse.json({ error: "Курс, който вече е продаден към MK." }, { status: 409 });
      const qty = l.quantity ?? s.netQuantity;
      if (qty == null || !(qty > 0)) return NextResponse.json({ error: "Курс без количество." }, { status: 400 });
    }

    const year = (d.date ? new Date(d.date) : new Date()).getFullYear();
    const invoice = await prisma.$transaction(async (tx) => {
      const val = await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.bgMkInvoice, { year });
      const number = formatBgMkNumber(year, val);
      const inv = await tx.bgMkInvoice.create({
        data: {
          companyId: g.companyId, counterpartyCompanyId: d.counterpartyCompanyId, number,
          date: d.date ? new Date(d.date) : new Date(), currency: "EUR", vatRate: d.vatRate ?? null,
          note: d.note ?? null, createdById: g.userId,
        }, select: { id: true, number: true },
      });
      for (const l of d.lines) {
        const s = byId.get(l.shipmentId)!;
        const qty = l.quantity ?? s.netQuantity!;
        const fin = lineFinancials(qty, l.unitPrice, d.vatRate ?? null);
        await tx.bgMkInvoiceLine.create({
          data: {
            invoiceId: inv.id, shipmentId: l.shipmentId, productId: s.productId, productSnapshot: s.productNameSnapshot,
            unit: s.unit, quantity: qty, unitPrice: l.unitPrice, lineTotal: fin.net, vatAmount: fin.vat, grossAmount: fin.gross, currency: "EUR",
          },
        });
      }
      return inv;
    });
    await audit(g.companyId, g.userId, "create", "BgMkInvoice", invoice.id, `BG→MK фактура ${invoice.number} (${d.lines.length} позиции)`);
    return NextResponse.json({ id: invoice.id, number: invoice.number });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Фактура с този номер вече съществува, или курс вече е продаден." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
