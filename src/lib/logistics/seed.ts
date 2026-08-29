/**
 * Idempotent създаване на началната master data (автомобили + продукти + aliases +
 * настройки) за дадена фирма. Повторно изпълнение НЕ създава дубликати — всичко е
 * upsert по нормализиран unique ключ.
 */
import { prisma } from "@/lib/prisma";
import { normalizeRegistration, normalizeProductKey } from "@/lib/logistics/normalize";
import {
  SEED_VEHICLE_REGISTRATIONS, SEED_VEHICLE_ALIASES, SEED_PRODUCTS,
  SEED_TRUCK_TRAILERS, SEED_DESTINATIONS, SEED_PRODUCT_EXTRA_ALIASES,
} from "@/lib/logistics/masterData";
import { applyCementCatalog } from "@/lib/logistics/cementSync";

export type SeedResult = { vehicles: number; vehicleAliases: number; products: number; productAliases: number; destinations: number };

export async function seedLogisticsMasterData(companyId: string): Promise<SeedResult> {
  const result: SeedResult = { vehicles: 0, vehicleAliases: 0, products: 0, productAliases: 0, destinations: 0 };

  // Настройки по подразбиране (ако липсват).
  await prisma.logisticsSettings.upsert({
    where: { companyId }, create: { companyId }, update: {},
  });

  // ── Автомобили ──
  const regToId = new Map<string, string>();
  for (const reg of SEED_VEHICLE_REGISTRATIONS) {
    const norm = normalizeRegistration(reg);
    const v = await prisma.vehicle.upsert({
      where: { companyId_normalizedRegistration: { companyId, normalizedRegistration: norm } },
      create: { companyId, registration: reg, normalizedRegistration: norm },
      update: {}, // не презаписваме ръчни промени на потребителя
      select: { id: true },
    });
    regToId.set(reg, v.id);
    result.vehicles++;
    // Логистичен профил (ownership = неопределено по подразбиране).
    await prisma.vehicleLogisticsProfile.upsert({
      where: { vehicleId: v.id }, create: { vehicleId: v.id, ownershipType: "unspecified" }, update: {},
    });
  }

  // ── Камиони + ремаркета от SK501.xlsx (dedup; default trailer в профила) ──
  for (const { truck, trailer } of SEED_TRUCK_TRAILERS) {
    const norm = normalizeRegistration(truck);
    let id = regToId.get(truck);
    if (!id) {
      const v = await prisma.vehicle.upsert({
        where: { companyId_normalizedRegistration: { companyId, normalizedRegistration: norm } },
        create: { companyId, registration: truck, normalizedRegistration: norm },
        update: {}, select: { id: true },
      });
      id = v.id; regToId.set(truck, id); result.vehicles++;
    }
    // Записва default ремарке само ако профилът още няма (не презаписва ръчни промени).
    const prof = await prisma.vehicleLogisticsProfile.findUnique({ where: { vehicleId: id }, select: { trailerReg: true } });
    if (!prof) await prisma.vehicleLogisticsProfile.create({ data: { vehicleId: id, trailerReg: trailer, ownershipType: "unspecified" } });
    else if (!prof.trailerReg) await prisma.vehicleLogisticsProfile.update({ where: { vehicleId: id }, data: { trailerReg: trailer } });
  }

  // ── Дестинации (FCA градове) като маршрути (Кюстендил → град) ──
  for (const city of SEED_DESTINATIONS) {
    const exists = await prisma.logisticsRoute.findFirst({ where: { companyId, fromPlace: "Кюстендил", toPlace: city }, select: { id: true } });
    if (!exists) { await prisma.logisticsRoute.create({ data: { companyId, fromPlace: "Кюстендил", toPlace: city, note: "FCA" } }); result.destinations++; }
  }

  // ── Потвърдени alias-и на автомобили ──
  for (const [short, full] of Object.entries(SEED_VEHICLE_ALIASES)) {
    const vehicleId = regToId.get(full);
    if (!vehicleId) continue; // пълният номер трябва да е сред seed-натите
    const norm = normalizeRegistration(short);
    await prisma.vehicleAlias.upsert({
      where: { companyId_normalizedAlias: { companyId, normalizedAlias: norm } },
      create: { companyId, alias: short, normalizedAlias: norm, vehicleId },
      update: { vehicleId },
    });
    result.vehicleAliases++;
  }

  // ── Продукти + alias-и ──
  for (const p of SEED_PRODUCTS) {
    const norm = normalizeProductKey(p.canonicalName);
    const prod = await prisma.logisticsProduct.upsert({
      where: { companyId_normalizedName: { companyId, normalizedName: norm } },
      create: {
        companyId, canonicalName: p.canonicalName, normalizedName: norm,
        materialCode: p.materialCode, unit: p.unit, packaging: p.packaging,
      },
      update: { materialCode: p.materialCode, packaging: p.packaging }, // допълва потвърдени данни
      select: { id: true },
    });
    result.products++;
    for (const alias of p.aliases) {
      const an = normalizeProductKey(alias);
      if (an === norm) continue; // alias, идентичен на каноничното — пропускаме
      await prisma.logisticsProductAlias.upsert({
        where: { companyId_normalizedAlias: { companyId, normalizedAlias: an } },
        create: { companyId, productId: prod.id, alias, normalizedAlias: an },
        update: { productId: prod.id },
      });
      result.productAliases++;
    }
  }

  // ── Допълнителни aliases към съществуващи продукти (кирилски А, запетая, „/") ──
  for (const extra of SEED_PRODUCT_EXTRA_ALIASES) {
    const norm = normalizeProductKey(extra.canonicalName);
    const prod = await prisma.logisticsProduct.findUnique({ where: { companyId_normalizedName: { companyId, normalizedName: norm } }, select: { id: true } });
    if (!prod) continue;
    for (const alias of extra.aliases) {
      const an = normalizeProductKey(alias);
      if (an === norm) continue;
      await prisma.logisticsProductAlias.upsert({
        where: { companyId_normalizedAlias: { companyId, normalizedAlias: an } },
        create: { companyId, productId: prod.id, alias, normalizedAlias: an },
        update: { productId: prod.id },
      });
      result.productAliases++;
    }
  }

  // Canonical cement каталог (§16): гарантира шестте марки + category, архивира стари
  // system defaults. Изпълнява се СЛЕД историческия seed, за да остане един source of truth.
  await applyCementCatalog(prisma, companyId);

  return result;
}
