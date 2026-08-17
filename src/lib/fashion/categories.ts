/**
 * Категории материали по подразбиране (§3). Seed-ват се idempotent при първа употреба;
 * фирмата може да ги редактира/добавя от Настройки.
 */
import { prisma } from "@/lib/prisma";
import { DEFAULT_MATERIAL_CATEGORIES } from "@/lib/fashion/inventory";

export { DEFAULT_MATERIAL_CATEGORIES };

/** Създава липсващите категории по подразбиране за фирмата (idempotent). Връща броя нови. */
export async function seedFashionCategories(companyId: string): Promise<number> {
  const existing = await prisma.fashionMaterialCategory.findMany({
    where: { companyId }, select: { name: true },
  });
  const have = new Set(existing.map((c) => c.name));
  const missing = DEFAULT_MATERIAL_CATEGORIES.filter((n) => !have.has(n));
  if (missing.length) {
    await prisma.fashionMaterialCategory.createMany({
      data: missing.map((name, i) => ({ companyId, name, sortOrder: i })),
    });
  }
  return missing.length;
}
