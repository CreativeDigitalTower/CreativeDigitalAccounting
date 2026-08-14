import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { z } from "zod";

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.supplierInvoice.findMany({
    where: { companyId: g.companyId },
    select: {
      id: true, number: true, date: true, supplierId: true, currency: true, vatRate: true,
      headerTaxBase: true, headerVatTotal: true, headerGrandTotal: true,
      links: { select: { lineTotal: true, vatAmount: true, grossAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const out = rows.map((inv) => {
    const base = sumMoney(inv.links.map((l) => l.lineTotal));
    const vat = sumMoney(inv.links.map((l) => l.vatAmount));
    const total = sumMoney(inv.links.map((l) => l.grossAmount));
    // Разминаване между въведените header тотали и сумата от редовете.
    const mismatch = inv.headerGrandTotal != null && Math.abs(inv.headerGrandTotal - total) > 0.01;
    return { id: inv.id, number: inv.number, date: inv.date, supplierId: inv.supplierId, currency: inv.currency, shipments: inv.links.length, base, vat, total, mismatch };
  });
  return NextResponse.json(out);
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const schema = z.object({
  number: z.string().min(1).max(120),
  date: optDate,
  taxEventDate: optDate,
  supplierId: z.string().nullable().optional(),
  currency: z.string().max(8).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  paymentMethod: z.string().max(120).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  // header тотали от PDF (по желание) — за валидация
  headerTaxBase: z.number().nullable().optional(),
  headerVatTotal: z.number().nullable().optional(),
  headerGrandTotal: z.number().nullable().optional(),
  // прикачен оригинален PDF (по желание)
  file: z.object({
    originalFilename: z.string().min(1).max(300),
    mimeType: z.string().min(1),
    size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    dataUrl: z.string().min(1),
  }).nullable().optional(),
  lines: z.array(z.object({
    shipmentId: z.string(),
    lineNumber: z.number().int().nullable().optional(),
    unitPrice: z.number().nonnegative(),
    quantity: z.number().positive().nullable().optional(), // по желание; иначе = нето на курса
    vatRate: z.number().min(0).max(100).nullable().optional(),
  })).min(1),
});

export async function POST(req: Request) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const d = schema.parse(await req.json());
    if (d.file) {
      const v = validateUpload({ mimeType: d.file.mimeType, size: d.file.size, dataUrl: d.file.dataUrl });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // Проверка: всички курсове са на фирмата, имат нето и още НЕ са фактурирани.
    const ids = d.lines.map((l) => l.shipmentId);
    const shipments = await prisma.shipment.findMany({
      where: { id: { in: ids }, companyId: g.companyId, deletedAt: null },
      select: { id: true, netQuantity: true, dispatchNoteNumber: true, vehicleRegSnapshot: true, materialCodeSnapshot: true, productNameSnapshot: true, invoiceLinks: { select: { id: true } } },
    });
    if (shipments.length !== ids.length) return NextResponse.json({ error: "Някой курс не е намерен." }, { status: 404 });
    const byId = new Map(shipments.map((s) => [s.id, s]));
    for (const l of d.lines) {
      const s = byId.get(l.shipmentId)!;
      if (s.invoiceLinks.length > 0) return NextResponse.json({ error: "Курс, който вече е включен в друга фактура." }, { status: 409 });
      const qty = l.quantity ?? s.netQuantity;
      if (qty == null || !(qty > 0)) return NextResponse.json({ error: "Курс без количество." }, { status: 400 });
    }

    const [supplier, company] = await Promise.all([
      d.supplierId ? prisma.supplier.findFirst({ where: { id: d.supplierId, companyId: g.companyId }, select: { name: true } }) : Promise.resolve(null),
      prisma.company.findUnique({ where: { id: g.companyId }, select: { name: true } }),
    ]);
    const currency = d.currency || "EUR";

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.supplierInvoice.create({
        data: {
          companyId: g.companyId, supplierId: d.supplierId || null, number: d.number,
          date: d.date ? new Date(d.date) : null, taxEventDate: d.taxEventDate ? new Date(d.taxEventDate) : null,
          currency, vatRate: d.vatRate ?? null, paymentMethod: d.paymentMethod ?? null,
          supplierSnapshot: supplier?.name ?? null, recipientSnapshot: company?.name ?? null,
          headerTaxBase: d.headerTaxBase ?? null, headerVatTotal: d.headerVatTotal ?? null, headerGrandTotal: d.headerGrandTotal ?? null,
          note: d.note ?? null, createdById: g.userId,
          ...(d.file ? { fileName: d.file.originalFilename, originalFilename: d.file.originalFilename, mimeType: d.file.mimeType, dataUrl: d.file.dataUrl } : {}),
        },
        select: { id: true },
      });
      for (const l of d.lines) {
        const s = byId.get(l.shipmentId)!;
        const qty = l.quantity ?? s.netQuantity!;
        const rate = l.vatRate ?? d.vatRate ?? null;
        const fin = lineFinancials(qty, l.unitPrice, rate);
        await tx.supplierInvoiceShipmentLink.create({
          data: {
            invoiceId: inv.id, shipmentId: l.shipmentId, lineNumber: l.lineNumber ?? null,
            dispatchNoteSnapshot: s.dispatchNoteNumber, truckSnapshot: s.vehicleRegSnapshot,
            materialCodeSnapshot: s.materialCodeSnapshot, productSnapshot: s.productNameSnapshot,
            quantity: qty, unitPrice: l.unitPrice, vatRate: rate,
            lineTotal: fin.net, vatAmount: fin.vat, grossAmount: fin.gross, currency,
          },
        });
      }
      return inv;
    });

    await audit(g.companyId, g.userId, "create", "SupplierInvoice", invoice.id, `Holcim фактура ${d.number} (${d.lines.length} реда)`);
    return NextResponse.json({ id: invoice.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Фактурата или курс от нея вече съществува." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
