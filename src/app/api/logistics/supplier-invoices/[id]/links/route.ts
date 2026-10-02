import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Свързване/разсвързване на Holcim фактура ↔ експортна доставка (§G). M:N. Финансово
// действие → manage_invoices. Company-scoped за двете страни (IDOR-safe).
const postSchema = z.object({ exportSetId: z.string() });
const delSchema = z.object({ exportSetId: z.string() });

async function ownInvoice(companyId: string, id: string) {
  return prisma.supplierInvoice.findFirst({ where: { id, companyId }, select: { id: true, number: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const inv = await ownInvoice(g.companyId, id);
    if (!inv) return NextResponse.json({ error: "Фактурата не е намерена." }, { status: 404 });
    const { exportSetId } = postSchema.parse(await req.json());
    // Доставката трябва да е на АКТИВНАТА фирма (тя е продавачът/payable към Holcim).
    const set = await prisma.exportDocumentSet.findFirst({ where: { id: exportSetId, companyId: g.companyId, deletedAt: null }, select: { id: true, invoiceNumber: true } });
    if (!set) return NextResponse.json({ error: "Доставката не е намерена." }, { status: 404 });
    try {
      await prisma.supplierInvoiceExportLink.create({ data: { invoiceId: id, exportSetId, createdById: g.userId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true, already: true });
      throw e;
    }
    await audit(g.companyId, g.userId, "link", "SupplierInvoice", id, `Свързана доставка ${set.invoiceNumber} с Holcim фактура ${inv.number}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_invoices");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const inv = await ownInvoice(g.companyId, id);
    if (!inv) return NextResponse.json({ error: "Фактурата не е намерена." }, { status: 404 });
    const { exportSetId } = delSchema.parse(await req.json());
    // Разсвързваме само ако доставката е на активната фирма (scope).
    const set = await prisma.exportDocumentSet.findFirst({ where: { id: exportSetId, companyId: g.companyId }, select: { id: true } });
    if (!set) return NextResponse.json({ error: "Доставката не е намерена." }, { status: 404 });
    await prisma.supplierInvoiceExportLink.deleteMany({ where: { invoiceId: id, exportSetId } });
    await audit(g.companyId, g.userId, "unlink", "SupplierInvoice", id, `Разсвързана доставка от Holcim фактура ${inv.number}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
