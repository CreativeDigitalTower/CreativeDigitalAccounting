import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NewShipmentForm } from "@/components/app/logistics/NewShipmentForm";

export default async function Page() {
  const { companyId, caps } = await requireLogistics();
  if (!caps.manage_shipments) redirect("/dashboard/logistics/shipments");

  const [vehicles, products, carriers, suppliers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId, active: true, normalizedRegistration: { not: null } },
      select: { id: true, registration: true, logisticsProfile: { select: { trailerReg: true, carrierId: true, defaultDriver: true } } },
      orderBy: { registration: "asc" },
    }),
    prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, canonicalName: true, materialCode: true, unit: true }, orderBy: { canonicalName: "asc" } }),
    prisma.carrier.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <NewShipmentForm
      vehicles={vehicles.map((v) => ({ id: v.id, registration: v.registration, trailerReg: v.logisticsProfile?.trailerReg ?? null, carrierId: v.logisticsProfile?.carrierId ?? null, driver: v.logisticsProfile?.defaultDriver ?? null }))}
      products={products}
      carriers={carriers}
      suppliers={suppliers}
    />
  );
}
