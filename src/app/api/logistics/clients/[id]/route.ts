import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard } from "@/lib/logistics/access";
import { clientSalesSummary } from "@/lib/logistics/dossier";
import { assertClientCompanyInGroup } from "@/lib/logistics/finalClient";
import { summarizeTrips, bucketByMonth } from "@/lib/logistics/tripStats";
import { z } from "zod";

// Досие на краен клиент (§23-§25): статистика от Export Deliveries + история на доставките,
// плюс наследените MK-продажби/ръчни исторически данни. Company scope се валидира в рамките
// на групата (клиентът може да е в CRM на SEM, не на активната фирма). Soft-deleted НЕ
// участва (§42). Зареждат се само нужните полета (без attachment binary, §29).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_analytics");
  if (!g.ok) return g.res;
  const { id } = await params;
  const c = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true, companyId: true, name: true, eik: true, vatNumber: true, city: true, address: true, country: true, phone: true, contactEmail: true, contactPerson: true,
      mkInvoices: {
        select: { id: true, number: true, date: true, currency: true, lines: { select: { quantity: true, grossAmount: true, lineTotal: true, productSnapshot: true } } },
        orderBy: { createdAt: "desc" },
      },
      historicalMetrics: { select: { id: true, year: true, revenue: true, quantity: true, unit: true, note: true }, orderBy: { year: "desc" } },
      historicalProductMetrics: { select: { id: true, year: true, product: true, quantity: true, revenue: true }, orderBy: { year: "desc" } },
    },
  });
  if (!c) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
  if (!(await assertClientCompanyInGroup(g.companyId, c.companyId))) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });

  // Export Deliveries към този клиент (в които участва активната фирма).
  const sets = await prisma.exportDocumentSet.findMany({
    where: { clientId: id, deletedAt: null, OR: [{ companyId: g.companyId }, { buyerCompanyId: g.companyId }] },
    orderBy: [{ shipmentDate: "desc" }, { invoiceDate: "desc" }],
    select: {
      id: true, invoiceNumber: true, invoiceDate: true, shipmentDate: true, trailerReg: true, truckRegSnapshot: true,
      truckVehicleId: true, destination: true, productSnapshot: true, quantity: true, unit: true, status: true,
      _count: { select: { attachments: true } },
    },
    take: 500,
  });
  const rows = sets.map((s) => ({ date: s.shipmentDate ?? s.invoiceDate ?? null, quantity: s.quantity }));
  const distinctVehicles = new Set(sets.map((s) => s.truckVehicleId ?? s.truckRegSnapshot).filter(Boolean)).size;
  const distinctProducts = new Set(sets.map((s) => (s.productSnapshot ?? "").trim()).filter(Boolean)).size;

  const lines = c.mkInvoices.flatMap((inv) => inv.lines.map((l) => ({ ...l, product: l.productSnapshot, date: inv.date })));
  const summary = clientSalesSummary(lines, c.mkInvoices.length);

  return NextResponse.json({
    id: c.id, name: c.name, eik: c.eik, vatNumber: c.vatNumber, city: c.city, address: c.address, country: c.country, phone: c.phone, contactEmail: c.contactEmail, contactPerson: c.contactPerson,
    deliveryStats: { ...summarizeTrips(rows), distinctVehicles, distinctProducts, monthly: bucketByMonth(rows, 12) },
    deliveries: sets.map((s) => ({
      id: s.id, invoiceNumber: s.invoiceNumber, date: (s.shipmentDate ?? s.invoiceDate)?.toISOString() ?? null,
      truck: s.truckRegSnapshot, trailer: s.trailerReg, product: s.productSnapshot, quantity: s.quantity, unit: s.unit,
      destination: s.destination, status: s.status, vehicleId: s.truckVehicleId, attachmentCount: s._count.attachments,
    })),
    summary,
    invoices: c.mkInvoices.map((inv) => ({ id: inv.id, number: inv.number, date: inv.date, currency: inv.currency, gross: inv.lines.reduce((s, l) => s + (l.grossAmount ?? 0), 0) })),
    historical: c.historicalMetrics,
    historicalProducts: c.historicalProductMetrics,
  });
}

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  eik: z.string().max(40).nullable().optional(),
  vatNumber: z.string().max(40).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  contactEmail: z.string().max(160).nullable().optional(),
  contactPerson: z.string().max(160).nullable().optional(),
});

// Редакция на master Client (§29/§30). НЕ пренаписва исторически snapshots (§31) — те са
// отделни полета на ExportDocumentSet и остават непроменени. Company scope в рамките на групата.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  const { id } = await params;
  try {
    const d = patchSchema.parse(await req.json());
    const c = await prisma.client.findUnique({ where: { id }, select: { companyId: true } });
    if (!c) return NextResponse.json({ error: "Не е намерен." }, { status: 404 });
    if (!(await assertClientCompanyInGroup(g.companyId, c.companyId))) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
    const trim = (v: string | null | undefined) => (v == null ? v : v.trim() || null);
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name.trim() } : {}),
        ...(d.eik !== undefined ? { eik: trim(d.eik) } : {}),
        ...(d.vatNumber !== undefined ? { vatNumber: trim(d.vatNumber) } : {}),
        ...(d.address !== undefined ? { address: trim(d.address) } : {}),
        ...(d.city !== undefined ? { city: trim(d.city) } : {}),
        ...(d.country !== undefined ? { country: trim(d.country) } : {}),
        ...(d.phone !== undefined ? { phone: trim(d.phone) } : {}),
        ...(d.contactEmail !== undefined ? { contactEmail: trim(d.contactEmail) } : {}),
        ...(d.contactPerson !== undefined ? { contactPerson: trim(d.contactPerson) } : {}),
      },
      select: { id: true, name: true, eik: true, vatNumber: true, city: true, address: true, country: true, phone: true, contactEmail: true, contactPerson: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
