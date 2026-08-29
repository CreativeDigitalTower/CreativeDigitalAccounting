import { requireLogistics, groupCounterparties } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExportSetForm } from "@/components/app/logistics/ExportSetForm";
import { MK_DESTINATIONS, mergeDestinations } from "@/lib/logistics/deliveryTerms";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  if (!caps.manage_documents) redirect("/dashboard/logistics/export");

  const [vehicles, products, routes, buyers, clients] = await Promise.all([
    prisma.vehicle.findMany({ where: { companyId, active: true, normalizedRegistration: { not: null } }, select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true } } }, orderBy: { registration: "asc" } }),
    prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true, category: true }, orderBy: { canonicalName: "asc" } }),
    prisma.logisticsRoute.findMany({ where: { companyId, active: true }, select: { id: true, fromPlace: true, toPlace: true, note: true }, orderBy: { toPlace: "asc" } }),
    groupCounterparties(companyId),
    prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);

  // Уникален списък дестинации (§4/§5): canonical MK + от маршрутите + вече ползвани в
  // Export Sets, dedupe по нормализиран ключ (без Skopje/SKOPIE/Скопие дубли).
  const usedDestinations = await prisma.exportDocumentSet.findMany({
    where: { companyId, destination: { not: null } }, select: { destination: true }, take: 2000,
  });
  const destinations = mergeDestinations(
    MK_DESTINATIONS,
    routes.map((r) => r.toPlace),
    usedDestinations.map((s) => s.destination),
  );

  return (
    <ExportSetForm
      vehicles={vehicles.map((v) => ({ id: v.id, registration: v.registration, trailerReg: v.logisticsProfile?.trailerReg ?? null }))}
      products={products}
      routes={routes.map((r) => ({ id: r.id, label: `${r.note ? r.note + " " : ""}${r.toPlace}` }))}
      buyers={buyers}
      clients={clients}
      destinations={destinations}
    />
  );
}
