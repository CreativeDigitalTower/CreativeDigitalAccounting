import { requireLogistics, groupCounterparties, companyCanCreateExports } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExportSetForm } from "@/components/app/logistics/ExportSetForm";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  // §1: без право за управление ИЛИ фирма без export-create (SEM) → обратно към списъка.
  if (!caps.manage_documents || !(await companyCanCreateExports(companyId))) redirect("/dashboard/logistics/export");

  const [vehicles, products, routes, buyers] = await Promise.all([
    prisma.vehicle.findMany({ where: { companyId, active: true, normalizedRegistration: { not: null } }, select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true } } }, orderBy: { registration: "asc" } }),
    prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true, category: true }, orderBy: { canonicalName: "asc" } }),
    prisma.logisticsRoute.findMany({ where: { companyId, active: true }, select: { id: true, fromPlace: true, toPlace: true, note: true }, orderBy: { toPlace: "asc" } }),
    groupCounterparties(companyId),
  ]);
  // Краен клиент = клиент на СВЪРЗАНАТА buyer фирма (SEM), не на активната BG фирма (§1/§2).
  // buyers идват от groupCounterparties → cross-company е ограничено до групата (§3).
  const defaultBuyerId = buyers[0]?.id ?? null;
  const clients = defaultBuyerId
    ? await prisma.client.findMany({ where: { companyId: defaultBuyerId, status: { notIn: ["inactive", "lost"] } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000 })
    : [];

  // Дестинациите за нова доставка идват САМО от active master записите (§12/§19) — без
  // hardcoded масив. Клиентът управлява списъка от раздел „Дестинации".
  const activeDestinations = await prisma.logisticsDestination.findMany({
    where: { companyId, active: true }, select: { name: true }, orderBy: { name: "asc" },
  });
  const destinations = activeDestinations.map((d) => d.name);

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
