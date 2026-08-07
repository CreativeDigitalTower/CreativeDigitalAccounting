import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/session";
import { audit } from "@/lib/documents";
import { missingPresets } from "@/lib/expenseCategories";

// Създава липсващите стандартни категории разходи за фирмата (идемпотентно).
export async function POST() {
  try {
    const { companyId, userId } = await requireFeature("expenses");
    const existing = await prisma.expenseCategory.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      select: { name: true },
    });
    const toCreate = missingPresets(existing.map((c) => c.name));
    if (toCreate.length > 0) {
      await prisma.expenseCategory.createMany({
        data: toCreate.map((name) => ({ companyId, name, isCustom: false })),
      });
      await audit(companyId, userId, "create", "ExpenseCategory", companyId, `Добавени ${toCreate.length} стандартни категории разходи`);
    }
    return NextResponse.json({ success: true, created: toCreate.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? "Сървърна грешка." : "Сървърна грешка." }, { status: 500 });
  }
}
