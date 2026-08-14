/**
 * Idempotent създаване на началната master data (автомобили + продукти + aliases +
 * настройки) за дадена фирма. Повторно изпълнение НЕ създава дубликати — всичко е
 * upsert по нормализиран unique ключ.
 */
import { prisma } from "@/lib/prisma";
import { normalizeRegistration, normalizeProductKey } from "@/lib/logistics/normalize";
import {
  SEED_VEHICLE_REGISTRATIONS, SEED_VEHICLE_ALIASES, SEED_PRODUCTS,
} from "@/lib/logistics/masterData";

export type SeedResult = { vehicles: number; vehicleAliases: number; products: number; productAliases: number };

export async function seedLogisticsMasterData(companyId: string): Promise<SeedResult> {
  const result: SeedResult = { vehicles: 0, vehicleAliases: 0, products: 0, productAliases: 0 };

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

  return result;
}
