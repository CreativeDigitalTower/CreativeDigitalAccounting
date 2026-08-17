/** Idempotent seed на категориите операции по подразбиране (§9). */
import { prisma } from "@/lib/prisma";
import { DEFAULT_OPERATION_CATEGORIES } from "@/lib/fashion/operations";

export async function seedFashionOperationCategories(companyId: string): Promise<number> {
  const existing = await prisma.fashionOperationCategory.findMany({ where: { companyId }, select: { name: true } });
  const have = new Set(existing.map((c) => c.name));
  const missing = DEFAULT_OPERATION_CATEGORIES.filter((c) => !have.has(c.name));
  if (missing.length) {
    await prisma.fashionOperationCategory.createMany({
      data: missing.map((c, i) => ({ companyId, code: c.code, name: c.name, sortOrder: i })),
    });
  }
  return missing.length;
}
