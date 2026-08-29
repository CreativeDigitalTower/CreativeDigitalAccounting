/**
 * Прилага canonical cement каталога върху една фирма (§16): гарантира шестте марки
 * (правилна category, active, isSystemDefault) и архивира известните стари system
 * defaults — БЕЗ да пипа custom продуктите на клиента. Idempotent. Споделя се от seed-а
 * (нови фирми) и от sync скрипта (съществуващи фирми) — един source of truth.
 */
import type { PrismaClient } from "@prisma/client";
import { normalizeProductKey } from "@/lib/logistics/normalize";
import { CEMENT_CATALOG, LEGACY_KEYS } from "@/lib/logistics/cementCatalog";

export type CementSyncResult = { created: number; kept: number; archived: number };

export async function applyCementCatalog(prisma: PrismaClient, companyId: string): Promise<CementSyncResult> {
  const res: CementSyncResult = { created: 0, kept: 0, archived: 0 };

  for (const p of CEMENT_CATALOG) {
    const norm = normalizeProductKey(p.canonicalName);
    const existing = await prisma.logisticsProduct.findUnique({
      where: { companyId_normalizedName: { companyId, normalizedName: norm } }, select: { id: true },
    });
    const prod = await prisma.logisticsProduct.upsert({
      where: { companyId_normalizedName: { companyId, normalizedName: norm } },
      create: { companyId, canonicalName: p.canonicalName, normalizedName: norm, unit: p.unit, packaging: p.packaging, category: p.category, isSystemDefault: true, active: true },
      // НЕ пренаписваме canonicalName (§1/§3 — пази изписването), само привеждаме
      // category/active/isSystemDefault и попълваме packaging, ако липсва.
      update: { category: p.category, isSystemDefault: true, active: true },
      select: { id: true },
    });
    if (existing) res.kept++; else res.created++;

    for (const alias of p.aliases) {
      const an = normalizeProductKey(alias);
      if (an === norm) continue;
      const clash = await prisma.logisticsProductAlias.findUnique({ where: { companyId_normalizedAlias: { companyId, normalizedAlias: an } }, select: { id: true } });
      if (!clash) await prisma.logisticsProductAlias.create({ data: { companyId, productId: prod.id, alias, normalizedAlias: an } });
    }
  }

  // Архивиране на известните стари system defaults (само тях, §16D/§17).
  const candidates = await prisma.logisticsProduct.findMany({ where: { companyId, active: true }, select: { id: true, normalizedName: true } });
  for (const c of candidates) {
    if (LEGACY_KEYS.has(c.normalizedName)) {
      await prisma.logisticsProduct.update({ where: { id: c.id }, data: { active: false } });
      res.archived++;
    }
  }
  return res;
}
