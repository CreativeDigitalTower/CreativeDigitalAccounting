import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, inSameGroup } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { nextSequenceValue } from "@/lib/logistics/sequence";
import { SEQ_SCOPE, formatMkNumber, MK_DEFAULT_VAT_RATE } from "@/lib/logistics/config";
import { lineFinancials } from "@/lib/logistics/money";
import { mkInvoiceMissingFields } from "@/lib/logistics/received";
import { z } from "zod";

// Създаване на MK фактура (SEM INTERNATIONAL DOOEL → краен MK клиент) ДИРЕКТНО от
// получена BG→MK доставка (§10/§11). Продавач = активната MK фирма; източникът е
// ExportDocumentSet (buyerCompanyId = MK, същата CompanyGroup). Количество/продукт се
// autofill-ват от доставката; единичната цена е MK продажна (editable, §16). Не се
// копира BG номер — ползва се MK sequence (§17). Дубликат се блокира (§26).
const schema = z.object({
  clientId: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().positive().optional(),
  date: z.string().datetime().nullable().optional().or(z.literal("").transform(() => null)),
  currency: z.string().max(8).optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const d = schema.parse(await req.json());

    // Източникът е получена доставка на активната MK фирма (buyer) в същата група (§30).
    const set = await prisma.exportDocumentSet.findUnique({
      where: { id },
      select: { id: true, companyId: true, buyerCompanyId: true, productSnapshot: true, quantity: true, unit: true, invoiceNumber: true },
    });
    if (!set) return NextResponse.json({ error: "Доставката не е намерена." }, { status: 404 });
    if (set.buyerCompanyId !== g.companyId || !(await inSameGroup(g.companyId, set.companyId))) {
      return NextResponse.json({ error: "Няма достъп до тази доставка." }, { status: 403 });
    }

    // Дубликат: една доставка → една MK фактура (v1, §26/§29). Съществува ли вече?
    const existing = await prisma.mkInvoice.findFirst({ where: { companyId: g.companyId, sourceExportSetId: set.id }, select: { id: true, number: true } });
    if (existing) return NextResponse.json({ error: "Вече има издадена MK фактура за тази доставка.", invoice: existing }, { status: 409 });

    // Краен клиент = собствен CRM клиент на MK фирмата (§12).
    const client = await prisma.client.findFirst({ where: { id: d.clientId, companyId: g.companyId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });

    const quantity = d.quantity ?? set.quantity ?? 0;
    const missing = mkInvoiceMissingFields({ clientId: d.clientId, quantity, product: set.productSnapshot });
    if (missing.length) return NextResponse.json({ error: "Липсват задължителни данни за фактуриране.", missing }, { status: 400 });

    const currency = d.currency || "MKD";
    const vatRate = d.vatRate ?? MK_DEFAULT_VAT_RATE;
    const date = d.date ? new Date(d.date) : new Date();
    const year = date.getFullYear();

    try {
      const invoice = await prisma.$transaction(async (tx) => {
        // Пази срещу гонка: повторна проверка вътре в транзакцията.
        const dup = await tx.mkInvoice.findFirst({ where: { companyId: g.companyId, sourceExportSetId: set.id }, select: { id: true } });
        if (dup) throw new Error("DUP");
        const val = await nextSequenceValue(tx, g.companyId, SEQ_SCOPE.mkInvoice, { year });
        const number = formatMkNumber(year, val);
        const fin = lineFinancials(quantity, d.unitPrice, vatRate);
        const inv = await tx.mkInvoice.create({
          data: {
            companyId: g.companyId, clientId: d.clientId, sourceExportSetId: set.id, number,
            date, currency, vatRate, note: d.note ?? null, createdById: g.userId,
            lines: { create: [{ sourceBgMkLineId: null, productSnapshot: set.productSnapshot, unit: set.unit || "t", quantity, unitPrice: d.unitPrice, lineTotal: fin.net, vatAmount: fin.vat, grossAmount: fin.gross, currency }] },
          },
          select: { id: true, number: true },
        });
        return inv;
      }, { isolationLevel: "Serializable" });

      await audit(g.companyId, g.userId, "create", "MkInvoice", invoice.id, `MK фактура ${invoice.number} от получена доставка ${set.invoiceNumber}`);
      return NextResponse.json({ id: invoice.id, number: invoice.number });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "DUP") return NextResponse.json({ error: "Вече има издадена MK фактура за тази доставка." }, { status: 409 });
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
