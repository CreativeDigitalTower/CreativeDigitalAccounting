/**
 * Идемпотентен, company-scoped импорт на реалния автопарк на клиента с цимент (§33).
 * Повторно изпълнение НЕ създава дубликати (dedup по normalized рег. номера + carrier),
 * НЕ презаписва вече въведени/редактирани данни (update: {}), НЕ изобретява липсващи
 * стойности (null остава null, §34).
 */
import { prisma } from "@/lib/prisma";
import { normalizeRegistration, normalizeProductKey } from "@/lib/logistics/normalize";
import { splitTruckTrailer } from "@/lib/logistics/exportDocs";
import { CEMENT_FLEET, CEMENT_PRODUCTS } from "@/lib/logistics/cementFleet.data";

export type CementImportResult = {
  carriers: number; trucks: number; trailers: number; drivers: number; configurations: number;
  products: number; missingDrivers: number; missingPayload: number;
};

export async function importCementFleet(companyId: string): Promise<CementImportResult> {
  const res: CementImportResult = { carriers: 0, trucks: 0, trailers: 0, drivers: 0, configurations: 0, products: 0, missingDrivers: 0, missingPayload: 0 };
  const truckIds = new Set<string>();
  const trailerNorms = new Set<string>();
  const driverNames = new Set<string>();

  // ── Продукти (само липсващите) ──
  for (const name of [...CEMENT_PRODUCTS.bulk, ...CEMENT_PRODUCTS.bags]) {
    const norm = normalizeProductKey(name);
    const existing = await prisma.logisticsProduct.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: norm } }, select: { id: true } });
    if (!existing) { await prisma.logisticsProduct.create({ data: { companyId, canonicalName: name, normalizedName: norm } }); res.products++; }
  }

  // ── Превозвачи + конфигурации ──
  for (const grp of CEMENT_FLEET) {
    const carrierName = grp.carrier.trim();
    let carrier = await prisma.carrier.findFirst({ where: { companyId, name: carrierName }, select: { id: true } });
    if (!carrier) { carrier = await prisma.carrier.create({ data: { companyId, name: carrierName }, select: { id: true } }); res.carriers++; }

    for (const cfg of grp.configs) {
      const { truck, trailer } = splitTruckTrailer(cfg.combo);
      if (!truck) continue;
      const truckNorm = normalizeRegistration(truck);
      if (!truckNorm) continue;

      // Влекач (Vehicle) — dedup по нормализиран номер; не презаписва съществуващ.
      const vehicle = await prisma.vehicle.upsert({
        where: { companyId_normalizedRegistration: { companyId, normalizedRegistration: truckNorm } },
        create: { companyId, registration: truck, normalizedRegistration: truckNorm },
        update: {}, select: { id: true },
      });
      truckIds.add(vehicle.id);

      const trailerNorm = trailer ? normalizeRegistration(trailer) : "";
      if (trailerNorm) trailerNorms.add(trailerNorm);
      if (cfg.driver) driverNames.add(cfg.driver.trim());
      if (!cfg.driver) res.missingDrivers++;
      if (cfg.maxPayloadTons == null) res.missingPayload++;

      // Конфигурация — dedup по (влекач, ремарке, вид товар, превозвач); не презаписва.
      const before = await prisma.vehicleConfiguration.findUnique({
        where: { companyId_vehicleId_trailerRegNorm_cargoMode_carrierId: { companyId, vehicleId: vehicle.id, trailerRegNorm: trailerNorm, cargoMode: cfg.cargoMode ?? "", carrierId: carrier.id } },
        select: { id: true },
      });
      if (!before) {
        await prisma.vehicleConfiguration.create({
          data: {
            companyId, vehicleId: vehicle.id, trailerReg: trailer, trailerRegNorm: trailerNorm, carrierId: carrier.id,
            defaultDriver: cfg.driver ?? null, driverPhone: cfg.phone ?? null, cargoMode: cfg.cargoMode ?? "",
            maxPayloadTons: cfg.maxPayloadTons ?? null, source: "import:cement",
          },
        });
        res.configurations++;
      }
    }
  }
  res.trucks = truckIds.size;
  res.trailers = trailerNorms.size;
  res.drivers = driverNames.size;
  return res;
}
