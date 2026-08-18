import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fashionApiGuard } from "@/lib/fashion/access";
import { audit } from "@/lib/documents";
import { z } from "zod";

// Добавя ред към отчета (само докато е чернова). Себестойността се снапшотва при приключване.
const schema = z.object({
  finishedGoodId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().min(0),
  discount: z.number().min(0).optional(),
  note: z.string().max(200).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const rep = await prisma.fashionSalesReport.findFirst({ where: { id, companyId: g.companyId }, select: { id: true, status: true } });
    if (!rep) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (rep.status !== "draft") return NextResponse.json({ error: "Приключен отчет не се редактира." }, { status: 409 });
    const d = schema.parse(await req.json());
    const fg = await prisma.fashionFinishedGood.findFirst({ where: { id: d.finishedGoodId, companyId: g.companyId }, select: { id: true } });
    if (!fg) return NextResponse.json({ error: "SKU не е намерен." }, { status: 404 });
    const line = await prisma.fashionSalesLine.create({ data: { reportId: id, finishedGoodId: d.finishedGoodId, quantity: d.quantity, price: d.price, discount: d.discount ?? 0, note: d.note ?? null } });
    await audit(g.companyId, g.userId, "update", "FashionSalesReport", id, "Добавен ред продажба");
    return NextResponse.json({ id: line.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await fashionApiGuard("manage_sales_reports");
  if (!g.ok) return g.res;
  const { id } = await params;
  const lineId = new URL(req.url).searchParams.get("lineId");
  if (!lineId) return NextResponse.json({ error: "Липсва lineId." }, { status: 400 });
  const rep = await prisma.fashionSalesReport.findFirst({ where: { id, companyId: g.companyId }, select: { status: true } });
  if (!rep) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  if (rep.status !== "draft") return NextResponse.json({ error: "Приключен отчет не се редактира." }, { status: 409 });
  const line = await prisma.fashionSalesLine.findFirst({ where: { id: lineId, reportId: id }, select: { id: true } });
  if (!line) return NextResponse.json({ error: "Редът не е намерен." }, { status: 404 });
  await prisma.fashionSalesLine.delete({ where: { id: lineId } });
  return NextResponse.json({ success: true });
}
