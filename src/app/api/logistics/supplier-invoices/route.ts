import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/fileSecurity";
import { lineFinancials, sumMoney } from "@/lib/logistics/money";
import { matchStatusFor } from "@/lib/logistics/invoiceMatch";
import { z } from "zod";

export async function GET() {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const rows = await prisma.supplierInvoice.findMany({
    where: { companyId: g.companyId },
    select: {
      id: true, number: true, date: true, supplierId: true, currency: true,
      headerTaxBase: true, headerVatTotal: true, headerGrandTotal: true,
      links: { select: { lineTotal: true, vatAmount: true, grossAmount: true, matchStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const out = rows.map((inv) => {
    const base = sumMoney(inv.links.map((l) => l.lineTotal));
    const vat = sumMoney(inv.links.map((l) => l.vatAmount));
    const total = sumMoney(inv.links.map((l) => l.grossAmount));
    const mismatch = inv.headerGrandTotal != null && Math.abs(inv.headerGrandTotal - total) > 0.01;
    const unresolved = inv.links.filter((l) => l.matchStatus && l.matchStatus !== "matched").length;
    return { id: inv.id, number: inv.number, date: inv.date, supplierId: inv.supplierId, currency: inv.currency, lines: inv.links.length, unresolved, base, vat, total, mismatch };
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
  headerTaxBase: z.number().nullable().optional(),
  headerVatTotal: z.number().nullable().optional(),
  headerGrandTotal: z.number().nullable().optional(),
  file: z.object({
    originalFilename: z.string().min(1).max(300),
    mimeType: z.string().min(1),
    size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    dataUrl: z.string().min(1),
  }).nullable().optional(),
  // Ръчно въведени позиции — самостоятелен source документ (без задължителен shipment).
  lines: z.array(z.object({
    lineNumber: z.number().int().nullable().optional(),
    materialCode: z.string().max(60).nullable().optional(),
    materialName: z.string().max(300).nullable().optional(),
    unit: z.string().max(20).nullable().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    vatRate: z.number().min(0).max(100).nullable().optional(),
    // ръчна корекция на изчислените стойности (при rounding в оригинала) — по желание
    netAmount: z.number().nullable().optional(),
    vatAmount: z.number().nullable().optional(),
    grossAmount: z.number().nullable().optional(),
    dispatchNoteNumber: z.string().max(120).nullable().optional(),
    vehicleRegistration: z.string().max(60).nullable().optional(),
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

    // Кандидат-курсове по въведените експедиционни бележки (за автоматичен matching).
    const dispatchNumbers = [...new Set(d.lines.map((l) => (l.dispatchNoteNumber ?? "").trim()).filter(Boolean))];
    const candidates = dispatchNumbers.length
      ? await prisma.shipment.findMany({
          where: { companyId: g.companyId, deletedAt: null, dispatchNoteNumber: { in: dispatchNumbers } },
          select: { id: true, dispatchNoteNumber: true, vehicleRegSnapshot: true, materialCodeSnapshot: true, netQuantity: true, invoiceLinks: { select: { id: true } } },
        })
      : [];
    const byDispatch = new Map(candidates.map((s) => [(s.dispatchNoteNumber ?? "").trim(), s]));

    const [supplier, company] = await Promise.all([
      d.supplierId ? prisma.supplier.findFirst({ where: { id: d.supplierId, companyId: g.companyId }, select: { name: true } }) : Promise.resolve(null),
      prisma.company.findUnique({ where: { id: g.companyId }, select: { name: true } }),
    ]);
    const currency = d.currency || "EUR";

    // Изгражда редовете с matching (без блокиране): свързваме shipment само ако е
    // намерен, свободен и още не е зает от предходен ред в тази фактура.
    const claimed = new Set<string>();
    const lineData = d.lines.map((l) => {
      const rate = l.vatRate ?? d.vatRate ?? null;
      const fin = lineFinancials(l.quantity, l.unitPrice, rate);
      const net = l.netAmount ?? fin.net;       // ръчната корекция има приоритет
      const vat = l.vatAmount ?? fin.vat;
      const gross = l.grossAmount ?? Math.round((net + vat) * 100) / 100;

      const key = (l.dispatchNoteNumber ?? "").trim();
      const cand = key ? byDispatch.get(key) : undefined;
      let shipmentId: string | null = null;
      let matchStatus: string;
      if (!cand) {
        matchStatus = l.dispatchNoteNumber ? "unmatched" : "unmatched";
      } else if (cand.invoiceLinks.length > 0 || claimed.has(cand.id)) {
        // Курсът вече е фактуриран (или зает от друг ред) → не блокираме, флагваме.
        matchStatus = "review";
      } else {
        claimed.add(cand.id);
        shipmentId = cand.id;
        matchStatus = matchStatusFor(
          { dispatchNoteNumber: cand.dispatchNoteNumber, registration: cand.vehicleRegSnapshot, materialCode: cand.materialCodeSnapshot, netQuantity: cand.netQuantity },
          { dispatchNoteNumber: l.dispatchNoteNumber, truck: l.vehicleRegistration, materialCode: l.materialCode, quantity: l.quantity },
        );
      }

      return {
        lineNumber: l.lineNumber ?? null,
        dispatchNoteSnapshot: l.dispatchNoteNumber ?? null, truckSnapshot: l.vehicleRegistration ?? null,
        materialCodeSnapshot: l.materialCode ?? null, materialName: l.materialName ?? null, unit: l.unit ?? null,
        quantity: l.quantity, unitPrice: l.unitPrice, vatRate: rate,
        lineTotal: net, vatAmount: vat, grossAmount: gross, currency,
        shipmentId, matchStatus,
      };
    });

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
      for (const ld of lineData) await tx.supplierInvoiceShipmentLink.create({ data: { invoiceId: inv.id, ...ld } });
      return inv;
    });

    const matched = lineData.filter((l) => l.matchStatus === "matched").length;
    await audit(g.companyId, g.userId, "create", "SupplierInvoice", invoice.id, `Holcim фактура ${d.number} (${d.lines.length} реда, ${matched} свързани)`);
    return NextResponse.json({ id: invoice.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Фактура с този номер вече съществува, или курс вече е фактуриран." }, { status: 409 });
    }
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
