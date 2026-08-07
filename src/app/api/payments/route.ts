import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { z } from "zod";

// GET → списък с плащания (филтри: direction/status/method/период/търсене).
export async function GET(req: Request) {
  try {
    const { companyId } = await requireFeature("cash");
    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = { companyId };
    const direction = sp.get("direction");
    if (direction === "in" || direction === "out") where.direction = direction;
    const status = sp.get("status");
    if (status === "completed" || status === "pending") where.status = status;
    const method = sp.get("method");
    if (method) where.method = method;
    const from = sp.get("from"), to = sp.get("to");
    if (from || to) where.date = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + "T23:59:59") } : {}) };
    const q = sp.get("q")?.trim();
    if (q) where.OR = [
      { counterpartyName: { contains: q, mode: "insensitive" } },
      { documentRef: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
    ];

    const payments = await prisma.payment.findMany({ where, orderBy: { date: "desc" }, take: 500 });
    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Неоторизиран достъп." }, { status: 401 });
  }
}

const schema = z.object({
  direction: z.enum(["in", "out"]),
  status: z.enum(["completed", "pending"]).default("completed"),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  method: z.string().default("bank_transfer"),
  reason: z.string().max(300).optional().nullable(),
  clientId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  cashRegisterId: z.string().optional().nullable(),
  bankAccount: z.string().max(60).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

// POST → запис на плащане в дневника (получено/извършено).
export async function POST(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("cash");
    const d = schema.parse(await req.json());

    // Snapshot на контрагента и документа (company-scoped, срещу IDOR).
    let counterpartyName: string | null = null;
    if (d.clientId) counterpartyName = (await prisma.client.findFirst({ where: { id: d.clientId, companyId }, select: { name: true } }))?.name ?? null;
    else if (d.supplierId) counterpartyName = (await prisma.supplier.findFirst({ where: { id: d.supplierId, companyId }, select: { name: true } }))?.name ?? null;
    let documentRef: string | null = null;
    if (d.documentId) documentRef = (await prisma.document.findFirst({ where: { id: d.documentId, companyId }, select: { number: true } }))?.number ?? null;

    const payment = await prisma.payment.create({
      data: {
        companyId, direction: d.direction, status: d.status, amount: d.amount, currency: d.currency,
        date: new Date(d.date), dueDate: d.dueDate ? new Date(d.dueDate) : null,
        method: d.method, reason: d.reason ?? null,
        clientId: d.clientId ?? null, supplierId: d.supplierId ?? null, counterpartyName,
        documentId: d.documentId ?? null, documentRef,
        cashRegisterId: d.cashRegisterId ?? null, bankAccount: d.bankAccount ?? null,
        note: d.note ?? null, createdById: userId,
      },
    });
    await audit(companyId, userId, "create", "Payment", payment.id,
      `${d.direction === "in" ? "Получено" : "Извършено"} плащане ${d.amount} ${d.currency}${counterpartyName ? ` · ${counterpartyName}` : ""}${documentRef ? ` · ${documentRef}` : ""}`);
    return NextResponse.json(payment);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

// DELETE ?id → изтриване на запис от дневника.
export async function DELETE(req: Request) {
  try {
    const { companyId, userId } = await requireFeature("cash");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Липсва id." }, { status: 400 });
    const p = await prisma.payment.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!p) return NextResponse.json({ error: "Не е намерено." }, { status: 404 });
    await prisma.payment.delete({ where: { id } });
    await audit(companyId, userId, "delete", "Payment", id, "Изтрито плащане от дневника");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
