import { requireLogistics, groupCounterparties } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ExportSetForm } from "@/components/app/logistics/ExportSetForm";
import { MK_DESTINATIONS, mergeDestinations } from "@/lib/logistics/deliveryTerms";

// Пълна редакция на експортна доставка (§11/§12). Само собственикът (BG) може да
// редактира своята source доставка; MK получателят я вижда read-only (§35).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, caps } = await requireLogistics();
  const { id } = await params;
  if (!caps.manage_documents) redirect(`/dashboard/logistics/export/${id}`);

  const set = await prisma.exportDocumentSet.findFirst({
    where: { id, companyId, deletedAt: null },
    select: {
      id: true, invoiceNumber: true, invoiceDate: true, shipmentDate: true, deliveryTerm: true, placeOfShipment: true,
      destination: true, truckVehicleId: true, trailerReg: true, logisticsProductId: true, quantity: true,
      declarationCmrDate: true, dispatchNumber: true, buyerCompanyId: true, clientId: true,
    },
  });
  if (!set) notFound();

  const [vehicles, products, routes, buyers, usedDestinations, mkInvoice] = await Promise.all([
    prisma.vehicle.findMany({ where: { companyId, active: true, normalizedRegistration: { not: null } }, select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true } } }, orderBy: { registration: "asc" } }),
    prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true }, orderBy: { canonicalName: "asc" } }),
    prisma.logisticsRoute.findMany({ where: { companyId, active: true }, select: { id: true, toPlace: true, note: true }, orderBy: { toPlace: "asc" } }),
    groupCounterparties(companyId),
    prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, take: 2000 }),
    prisma.mkInvoice.findFirst({ where: { sourceExportSetId: set.id }, select: { id: true, number: true } }),
  ]);
  const clientList = await prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 });

  const destinations = mergeDestinations(MK_DESTINATIONS, routes.map((r) => r.toPlace), usedDestinations.map((s) => s.destination));

  return (
    <ExportSetForm
      vehicles={vehicles.map((v) => ({ id: v.id, registration: v.registration, trailerReg: v.logisticsProfile?.trailerReg ?? null }))}
      products={products}
      routes={routes.map((r) => ({ id: r.id, label: `${r.note ? r.note + " " : ""}${r.toPlace}` }))}
      buyers={buyers}
      clients={clientList}
      destinations={destinations}
      initial={{
        id: set.id, invoiceNumber: set.invoiceNumber,
        invoiceDate: set.invoiceDate?.toISOString() ?? null, shipmentDate: set.shipmentDate?.toISOString() ?? null,
        deliveryTerm: set.deliveryTerm, placeOfShipment: set.placeOfShipment, destination: set.destination,
        truckVehicleId: set.truckVehicleId, trailerReg: set.trailerReg, logisticsProductId: set.logisticsProductId,
        quantity: set.quantity, declarationCmrDate: set.declarationCmrDate?.toISOString() ?? null,
        dispatchNumber: set.dispatchNumber, buyerCompanyId: set.buyerCompanyId, clientId: set.clientId,
      }}
      mkInvoice={mkInvoice}
    />
  );
}
