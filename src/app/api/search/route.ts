import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

const DOC_LABEL: Record<string, string> = { invoice: "Фактура", proforma: "Проформа", quote: "Оферта", credit_note: "Кр. известие", debit_note: "Деб. известие" };

export async function GET(req: Request) {
  try {
    const { companyId } = await requireCompany();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ results: [] });
    const like = { contains: q, mode: "insensitive" as const };

    const [clients, suppliers, docs] = await Promise.all([
      prisma.client.findMany({ where: { companyId, OR: [{ name: like }, { eik: like }, { phone: like }, { contactPerson: like }] }, select: { id: true, name: true, eik: true }, take: 6 }),
      prisma.supplier.findMany({ where: { companyId, OR: [{ name: like }, { eik: like }] }, select: { id: true, name: true }, take: 4 }),
      prisma.document.findMany({ where: { companyId, OR: [{ number: like }, { client: { name: like } }] }, select: { id: true, number: true, type: true, client: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    ]);

    const results = [
      ...clients.map((c) => ({ type: "Клиент", label: c.name, sub: c.eik ?? "", href: `/dashboard/clients/${c.id}`, icon: "" })),
      ...docs.map((d) => ({ type: DOC_LABEL[d.type] ?? "Документ", label: `${d.number}`, sub: d.client?.name ?? "", href: `/dashboard/documents/${d.id}`, icon: "" })),
      ...suppliers.map((s) => ({ type: "Доставчик", label: s.name, sub: "", href: `/dashboard/suppliers/${s.id}`, icon: "" })),
    ];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
