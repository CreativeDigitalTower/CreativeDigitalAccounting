import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { lineTotal, invoiceTotals } from "@/lib/logistics/purchaseCalc";
import { z } from "zod";

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.supplierInvoice.findMany({
    where: { companyId: g.companyId },
    select: {
      id: true, number: true, date: true, supplierId: true, currency: true, vatRate: true,
      links: { select: { quantity: true, unitPrice: true, lineTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const out = rows.map((inv) => {
    const totals = invoiceTotals(inv.links.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })), inv.vatRate);
    return { id: inv.id, number: inv.number, date: inv.date, supplierId: inv.supplierId, currency: inv.currency, shipments: inv.links.length, ...totals };
  });
  return NextResponse.json(out);
}

const schema = z.object({
  number: z.string().min(1).max(120),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  taxEventDate: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  supplierId: z.string().nullable().optional(),
  currency: z.string().max(8).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  lines: z.array(z.object({ shipmentId: z.string(), unitPrice: z.number().nonnegative() })).min(1),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());

    // Проверка: всички курсове са на фирмата, имат нето и още НЕ са фактурирани.
    const ids = d.lines.map((l) => l.shipmentId);
    const shipments = await prisma.shipment.findMany({
      where: { id: { in: ids }, companyId: g.companyId, deletedAt: null },
      select: { id: true, netQuantity: true, invoiceLinks: { select: { id: true } } },
    });
    if (shipments.length !== ids.length) return NextResponse.json({ error: "Някой курс не е намерен." }, { status: 404 });
    const byId = new Map(shipments.map((s) => [s.id, s]));
    for (const l of d.lines) {
      const s = byId.get(l.shipmentId)!;
      if (s.netQuantity == null || !(s.netQuantity > 0)) return NextResponse.json({ error: "Курс без нето количество." }, { status: 400 });
      if (s.invoiceLinks.length > 0) return NextResponse.json({ error: "Курс, който вече е включен в друга фактура." }, { status: 409 });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.supplierInvoice.create({
        data: {
          companyId: g.companyId, supplierId: d.supplierId || null, number: d.number,
          date: d.date ? new Date(d.date) : null, taxEventDate: d.taxEventDate ? new Date(d.taxEventDate) : null,
          currency: d.currency || "EUR", vatRate: d.vatRate ?? null, note: d.note ?? null, createdById: g.userId,
        },
        select: { id: true },
      });
      for (const l of d.lines) {
        const s = byId.get(l.shipmentId)!;
        const qty = s.netQuantity!;
        await tx.supplierInvoiceShipmentLink.create({
          data: { invoiceId: inv.id, shipmentId: l.shipmentId, quantity: qty, unitPrice: l.unitPrice, lineTotal: lineTotal(qty, l.unitPrice) },
        });
      }
      return inv;
    });

    await audit(g.companyId, g.userId, "create", "SupplierInvoice", invoice.id, `Holcim фактура ${d.number} (${d.lines.length} курса)`);
    return NextResponse.json({ id: invoice.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Или дублиран номер фактура, или курс, добавен паралелно към друга фактура.
      return NextResponse.json({ error: "Фактурата или курс от нея вече съществува." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
