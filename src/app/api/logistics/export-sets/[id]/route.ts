import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logisticsApiGuard, exportSetReadRole, groupCounterparties } from "@/lib/logistics/access";
import { audit } from "@/lib/documents";
import { validationError, VMSG, type FieldErrors } from "@/lib/logistics/validation";
import { PLACE_OF_SHIPMENT_DEFAULT } from "@/lib/logistics/deliveryTerms";
import { missingEditFields, exportDeleteDecision } from "@/lib/logistics/exportSetEdit";
import { z } from "zod";

const EDIT_FIELD_MSG: Record<string, string> = {
  invoiceNumber: VMSG.required, placeOfShipment: VMSG.required, quantity: VMSG.quantityPositive,
  logisticsProductId: VMSG.product, truckVehicleId: VMSG.vehicle,
  deliveryTerm: "Моля, изберете условия на доставка – FCA или CPT.",
  destination: "Моля, изберете или въведете крайна дестинация.",
};

const detailSelect = {
  id: true, companyId: true, shipmentId: true, buyerCompanyId: true, clientId: true,
  invoiceNumber: true, invoiceDate: true, shipmentDate: true, deliveryTerm: true, placeOfShipment: true,
  destination: true, routeId: true,
  truckVehicleId: true, truckRegSnapshot: true, trailerReg: true, logisticsProductId: true, productSnapshot: true,
  quantity: true, unit: true, declarationCmrDate: true, dispatchNumber: true, status: true, note: true, createdAt: true, deletedAt: true,
  documents: { select: { id: true, docType: true, status: true, overridden: true, updatedAt: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("view_logistics");
  if (!g.ok) return g.res;
  const { id } = await params;
  // Зареждаме по id, после авторизираме (продавач или купувач от групата).
  const set = await prisma.exportDocumentSet.findUnique({ where: { id }, select: detailSelect });
  if (!set || set.deletedAt) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
  const role = await exportSetReadRole(g.companyId, set);
  if (!role) return NextResponse.json({ error: "Няма достъп." }, { status: 403 });
  const [seller, buyer, client, mkInvoice] = await Promise.all([
    prisma.company.findUnique({ where: { id: set.companyId }, select: { name: true } }),
    set.buyerCompanyId ? prisma.company.findUnique({ where: { id: set.buyerCompanyId }, select: { name: true } }) : Promise.resolve(null),
    // Клиентът може да е на buyer фирмата (SEM), затова резолвим по id (§2).
    set.clientId ? prisma.client.findUnique({ where: { id: set.clientId }, select: { name: true } }) : Promise.resolve(null),
    // MK фактурата, издадена от получателя за тази доставка (group visibility, §18/§31).
    set.buyerCompanyId ? prisma.mkInvoice.findFirst({ where: { sourceExportSetId: set.id, companyId: set.buyerCompanyId }, select: { id: true, number: true } }) : Promise.resolve(null),
  ]);
  return NextResponse.json({ ...set, sellerName: seller?.name ?? null, buyerName: buyer?.name ?? null, clientName: client?.name ?? null, mkInvoice, viewerRole: role });
}

const optDate = z.string().datetime().nullable().optional().or(z.literal("").transform(() => null));
const patchSchema = z.object({
  invoiceNumber: z.string().max(60).optional(),
  invoiceDate: optDate,
  shipmentDate: optDate,
  deliveryTerm: z.enum(["FCA", "CPT"]).nullable().optional(),
  placeOfShipment: z.string().max(200).nullable().optional(),
  destination: z.string().max(200).nullable().optional(),
  buyerCompanyId: z.string().nullable().optional(),
  truckVehicleId: z.string().nullable().optional(),
  truckRegSnapshot: z.string().max(40).nullable().optional(), // директна корекция на камиона (source-of-truth)
  trailerReg: z.string().max(40).nullable().optional(),
  logisticsProductId: z.string().nullable().optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(20).optional(),
  declarationCmrDate: optDate,
  dispatchNumber: z.string().max(60).nullable().optional(),
  clientId: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

// PATCH e умишлено PARTIAL (частична редакция): работи и за пълната форма „Редактирай",
// и за inline quick-edit-а в detail-а. Пази срещу ИЗПРАЗВАНЕ на задължителни полета —
// ако ключ е подаден, но празен, връща structured грешка (§18), без да блокира полета,
// които просто не са в payload-а.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    // company-scoped + не позволяваме редакция на изтрита доставка (§35).
    const existing = await prisma.exportDocumentSet.findFirst({ where: { id, companyId: g.companyId, deletedAt: null }, select: { id: true, buyerCompanyId: true } });
    if (!existing) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });
    const d = patchSchema.parse(await req.json());

    // Валидация: подадено, но празно задължително поле → грешка (не silent, §18/§27).
    const missing = missingEditFields(d);
    if (missing.length) {
      const fe: FieldErrors = {};
      for (const k of missing) fe[k] = EDIT_FIELD_MSG[k] ?? VMSG.required;
      return validationError(fe);
    }

    const data: Record<string, unknown> = {};
    if (d.invoiceNumber !== undefined) data.invoiceNumber = d.invoiceNumber.trim();
    if (d.invoiceDate !== undefined) data.invoiceDate = d.invoiceDate ? new Date(d.invoiceDate) : null;
    if (d.shipmentDate !== undefined) data.shipmentDate = d.shipmentDate ? new Date(d.shipmentDate) : null;
    if (d.deliveryTerm !== undefined) data.deliveryTerm = d.deliveryTerm;
    if (d.placeOfShipment !== undefined) data.placeOfShipment = (d.placeOfShipment ?? "").trim() || PLACE_OF_SHIPMENT_DEFAULT;
    if (d.destination !== undefined) data.destination = (d.destination ?? "").trim() || null;
    if (d.trailerReg !== undefined) data.trailerReg = d.trailerReg;
    if (d.truckRegSnapshot !== undefined) data.truckRegSnapshot = d.truckRegSnapshot;
    if (d.quantity !== undefined) data.quantity = d.quantity;
    if (d.unit !== undefined) data.unit = d.unit;
    if (d.declarationCmrDate !== undefined) data.declarationCmrDate = d.declarationCmrDate ? new Date(d.declarationCmrDate) : null;
    if (d.dispatchNumber !== undefined) data.dispatchNumber = d.dispatchNumber;
    if (d.note !== undefined) data.note = d.note;
    if (d.clientId !== undefined) {
      if (d.clientId) {
        // Клиентът може да е на buyer фирмата (SEM) или на активната (§1/§3). Валидираме
        // членство в групата за ефективния buyer (нов от payload-а или текущия на записа).
        const effectiveBuyer = d.buyerCompanyId !== undefined ? d.buyerCompanyId : existing.buyerCompanyId;
        const c = await prisma.client.findUnique({ where: { id: d.clientId }, select: { id: true, companyId: true } });
        if (!c) return NextResponse.json({ error: "Клиентът не е намерен." }, { status: 404 });
        const allowed = new Set([g.companyId, ...(effectiveBuyer ? [effectiveBuyer] : [])]);
        if (!allowed.has(c.companyId)) {
          if (c.companyId !== g.companyId) {
            const cps = await groupCounterparties(g.companyId);
            if (!cps.some((x) => x.id === c.companyId)) return NextResponse.json({ error: "Клиентът не е от свързана фирма." }, { status: 400 });
          }
        }
      }
      data.clientId = d.clientId || null;
    }
    if (d.buyerCompanyId !== undefined) {
      if (d.buyerCompanyId) {
        const cps = await groupCounterparties(g.companyId);
        if (!cps.some((c) => c.id === d.buyerCompanyId)) return NextResponse.json({ error: "Купувачът не е свързана фирма от групата." }, { status: 400 });
      }
      data.buyerCompanyId = d.buyerCompanyId || null;
    }
    if (d.truckVehicleId !== undefined) {
      if (d.truckVehicleId) {
        const v = await prisma.vehicle.findFirst({ where: { id: d.truckVehicleId, companyId: g.companyId }, select: { registration: true, logisticsProfile: { select: { trailerReg: true } } } });
        if (!v) return NextResponse.json({ error: "Автомобилът не е намерен." }, { status: 404 });
        data.truckVehicleId = d.truckVehicleId; data.truckRegSnapshot = v.registration;
        if (d.trailerReg === undefined && v.logisticsProfile?.trailerReg) data.trailerReg = v.logisticsProfile.trailerReg;
      } else { data.truckVehicleId = null; data.truckRegSnapshot = null; }
    }
    if (d.logisticsProductId !== undefined) {
      if (d.logisticsProductId) { const p = await prisma.logisticsProduct.findFirst({ where: { id: d.logisticsProductId, companyId: g.companyId }, select: { canonicalName: true, certificateNumber: true } }); if (!p) return NextResponse.json({ error: "Продуктът не е намерен." }, { status: 404 }); data.logisticsProductId = d.logisticsProductId; data.productSnapshot = p.canonicalName; data.certificateNumberSnapshot = p.certificateNumber ?? null; }
      else { data.logisticsProductId = null; data.productSnapshot = null; data.certificateNumberSnapshot = null; }
    }

    await prisma.exportDocumentSet.update({ where: { id }, data });
    await audit(g.companyId, g.userId, "update", "ExportDocumentSet", id, "Редакция на основни данни");
    const fresh = await prisma.exportDocumentSet.findUnique({ where: { id }, select: detailSelect });
    return NextResponse.json(fresh);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ error: "Фактура с този номер вече съществува." }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}

const delSchema = z.object({ reason: z.string().max(500).nullable().optional() });

// Soft delete (Кошче, §7). Пази срещу orphaned MK фактура (§4/§6): ако доставката вече е
// фактурирана от получателя, НЕ трие — връща 409 с линк към фактурата. Company-scoped +
// IDOR-safe: само собственикът (BG) може да трие своята source доставка (§35).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await logisticsApiGuard("manage_documents");
  if (!g.ok) return g.res;
  try {
    const { id } = await params;
    const set = await prisma.exportDocumentSet.findFirst({
      where: { id, companyId: g.companyId, deletedAt: null },
      select: { id: true, invoiceNumber: true },
    });
    if (!set) return NextResponse.json({ error: "Не е намерена." }, { status: 404 });

    // Зависимост: издадена MK фактура → блокирай (§6), за да няма фактура без източник.
    const mkInvoice = await prisma.mkInvoice.findFirst({ where: { sourceExportSetId: set.id }, select: { id: true, number: true } });
    const decision = exportDeleteDecision({ hasMkInvoice: !!mkInvoice });
    if (!decision.ok) {
      return NextResponse.json({ error: "MK_INVOICE_LINKED", mkInvoice, message: `Тази доставка е свързана с MK фактура № ${mkInvoice!.number}. Първо анулирайте/премахнете свързаната фактура.` }, { status: 409 });
    }

    const reason = delSchema.parse(await req.json().catch(() => ({}))).reason ?? null;
    await prisma.exportDocumentSet.update({ where: { id }, data: { deletedAt: new Date(), deletedById: g.userId, deleteReason: reason } });
    await audit(g.companyId, g.userId, "delete", "ExportDocumentSet", id, `EXPORT_DELIVERY_DELETED ${set.invoiceNumber}${reason ? ` — ${reason}` : ""}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    return NextResponse.json({ error: "Сървърна грешка." }, { status: 500 });
  }
}
