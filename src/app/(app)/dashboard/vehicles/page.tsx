import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VehiclesClient, type VehicleRow } from "@/components/app/VehiclesClient";

// Управление на фирмените автомобили — за авто-попълване на пътни листове и
// отчети за гориво в „Бизнес документи".
export default async function VehiclesPage() {
  const { companyId } = await requireCompany();
  const rows = await prisma.vehicle.findMany({ where: { companyId }, orderBy: { registration: "asc" } });
  const vehicles: VehicleRow[] = rows.map((v) => ({
    id: v.id, registration: v.registration, brand: v.brand, model: v.model,
    fuelType: v.fuelType, fuelNorm: v.fuelNorm, tankCapacity: v.tankCapacity, year: v.year,
  }));
  return <VehiclesClient initial={vehicles} />;
}
