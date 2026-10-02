import { requireLogistics, groupCounterparties, companyCanCreateExports } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExportSetForm } from "@/components/app/logistics/ExportSetForm";
import { resolveActiveDestinationNames } from "@/lib/logistics/destinations";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  // §1: без право за управление ИЛИ фирма без export-create (SEM) → обратно към списъка.
  if (!caps.manage_documents || !(await companyCanCreateExports(companyId))) redirect("/dashboard/logistics/export");

  const [vehicles, products, routes, buyers] = await Promise.all([
    prisma.vehicle.findMany({ where: { companyId, active: true, normalizedRegistration: { not: null } }, select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true, defaultDriver: true, carrier: { select: { name: true } } } } }, orderBy: { registration: "asc" } }),
    prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true, category: true, purchasePrice: true, purchaseCurrency: true }, orderBy: { canonicalName: "asc" } }),
    prisma.logisticsRoute.findMany({ where: { companyId, active: true }, select: { id: true, fromPlace: true, toPlace: true, note: true }, orderBy: { toPlace: "asc" } }),
    groupCounterparties(companyId),
  ]);
  // Краен клиент = клиент на СВЪРЗАНАТА buyer фирма (SEM), не на активната BG фирма (§1/§2).
  // buyers идват от groupCounterparties → cross-company е ограничено до групата (§3).
  const defaultBuyerId = buyers[0]?.id ?? null;
  const clients = defaultBuyerId
    ? await prisma.client.findMany({ where: { companyId: defaultBuyerId, status: { notIn: ["inactive", "lost"] } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000 })
    : [];

  // Дестинациите за нова доставка идват от active master записите (§12/§19). TRANSITIONAL:
  // ако master още не е населен (backfill не е пуснат), fallback към legacy — dropdown-ът
  // никога не остава празен (§8).
  const { names: destinations } = await resolveActiveDestinationNames(prisma, companyId);

  return (
    <ExportSetForm
      vehicles={vehicles.map((v) => ({ id: v.id, registration: v.registration, trailerReg: v.logisticsProfile?.trailerReg ?? null, carrier: v.logisticsProfile?.carrier?.name ?? null, driver: v.logisticsProfile?.defaultDriver ?? null }))}
      products={products.map((p) => ({ id: p.id, canonicalName: p.canonicalName, category: p.category, purchasePrice: p.purchasePrice == null ? null : Number(p.purchasePrice), purchaseCurrency: p.purchaseCurrency }))}
      routes={routes.map((r) => ({ id: r.id, label: `${r.note ? r.note + " " : ""}${r.toPlace}` }))}
      buyers={buyers}
      clients={clients}
      destinations={destinations}
    />
  );
}
