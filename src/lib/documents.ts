import { prisma } from "@/lib/prisma";
import { DOC_PREFIXES, FREE_PLAN_LIMIT, SUBSCRIPTION_PLANS, getYearMonth } from "@/lib/constants";
import { DocumentType } from "@prisma/client";

/**
 * Генерира пореден номер за документ по тип.
 * Формат:
 *   Фактура:   0000000001 (10 цифри, без префикс)
 *   Проформа:  PF-000000001
 *   Оферта:    OF-000000001
 *   Кр. изв.:  KI-000000001
 *   Деб. изв.: DI-000000001
 * Началната стойност за фактури идва от Company.invoiceNumberStart.
 */
export async function generateDocumentNumber(
  companyId: string,
  type: DocumentType
): Promise<string> {
  const prefix = DOC_PREFIXES[type] ?? "";

  const count = await prisma.document.count({
    where: { companyId, type },
  });

  let startBase = 1;
  if (type === "invoice") {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { invoiceNumberStart: true },
    });
    startBase = company?.invoiceNumberStart ?? 1;
  }

  const next = Math.max(startBase, count + 1);

  if (type === "invoice") {
    return String(next).padStart(10, "0"); // 0000000001
  }
  return `${prefix}${String(next).padStart(9, "0")}`; // PF-000000001
}

/** Проверява дали номерът вече се ползва от друг документ в същата фирма. */
export async function isNumberTaken(
  companyId: string,
  number: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.document.findFirst({
    where: { companyId, number, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

export async function checkInvoiceLimit(companyId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  const plan = (subscription?.plan ?? "free") as keyof typeof SUBSCRIPTION_PLANS;
  const limit = SUBSCRIPTION_PLANS[plan]?.docsPerMonth ?? FREE_PLAN_LIMIT;
  if (limit === Infinity) return true;

  const yearMonth = getYearMonth();
  const counter = await prisma.usageCounter.findUnique({
    where: { companyId_yearMonth: { companyId, yearMonth } },
  });

  return (counter?.documentsIssuedCount ?? 0) < limit;
}

export async function incrementInvoiceCounter(companyId: string) {
  const yearMonth = getYearMonth();
  await prisma.usageCounter.upsert({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    update: { documentsIssuedCount: { increment: 1 } },
    create: { companyId, yearMonth, documentsIssuedCount: 1 },
  });
}

/** Записва одит лог (кой / кога / какво). */
export async function audit(
  companyId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  summary?: string
) {
  try {
    await prisma.auditLog.create({
      data: { companyId, userId, action, entity, entityId, summary },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
