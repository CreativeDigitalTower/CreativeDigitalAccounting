import { prisma } from "@/lib/prisma";
import { DOC_PREFIXES, FREE_PLAN_LIMIT, SUBSCRIPTION_PLANS, getYearMonth } from "@/lib/constants";
import { DocumentType, Prisma } from "@prisma/client";
import { computeNextValue, formatInvoiceNumber, maxRegularValue, coreValue, advancedOverride } from "@/lib/invoiceNumbering";

// Клиент или транзакционен клиент — за да работят и вътре в $transaction (concurrency §18).
type Db = typeof prisma | Prisma.TransactionClient;

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
  type: DocumentType,
  db: Db = prisma,
): Promise<string> {
  const prefix = DOC_PREFIXES[type] ?? "";
  const docs = await db.document.findMany({ where: { companyId, type }, select: { number: true } });
  const numbers = docs.map((d) => d.number);

  let startBase = 1;
  let override: number | null = null;
  if (type === "invoice") {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { invoiceNumberStart: true, nextInvoiceNumber: true },
    });
    startBase = company?.invoiceNumberStart ?? 1;
    override = company?.nextInvoiceNumber ?? null; // изрично управляван следващ номер (§11)
  }
  // Централно изчисление: специалните номера със suffix се игнорират (§8), leading zeroes се пазят (§16).
  const next = computeNextValue(numbers, { startBase, override, prefix });
  return formatInvoiceNumber(next, type === "invoice" ? 10 : 9, prefix);
}

/** Проверява дали номерът вече се ползва от друг документ в същата фирма (§17). */
export async function isNumberTaken(
  companyId: string,
  number: string,
  excludeId?: string,
  db: Db = prisma,
): Promise<boolean> {
  const existing = await db.document.findFirst({
    where: { companyId, number, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

/**
 * След издаване на РЕДОВНА фактура придвижва управлявания следващ номер (§14/§18).
 * Работи само ако фирмата има активен override; при derived режим (NULL) не пазим нищо —
 * следващият номер винаги се извежда наlive. Специален номер не мърда последователността (§8).
 */
export async function advanceInvoiceSequence(db: Db, companyId: string, usedNumber: string): Promise<void> {
  const c = await db.company.findUnique({ where: { id: companyId }, select: { nextInvoiceNumber: true } });
  if (c?.nextInvoiceNumber == null) return;
  const next = advancedOverride(c.nextInvoiceNumber, usedNumber);
  if (next !== c.nextInvoiceNumber) await db.company.update({ where: { id: companyId }, data: { nextInvoiceNumber: next } });
}

/** Състояние на номерацията за фактури на фирмата — за Настройки/Super Admin (§10/§12). */
export async function getInvoiceSequenceInfo(companyId: string, db: Db = prisma) {
  const [docs, company] = await Promise.all([
    db.document.findMany({ where: { companyId, type: "invoice" }, select: { number: true } }),
    db.company.findUnique({ where: { id: companyId }, select: { invoiceNumberStart: true, nextInvoiceNumber: true } }),
  ]);
  const numbers = docs.map((d) => d.number);
  const maxV = maxRegularValue(numbers);
  const startBase = company?.invoiceNumberStart ?? 1;
  const override = company?.nextInvoiceNumber ?? null;
  const next = computeNextValue(numbers, { startBase, override });
  return {
    lastRegularValue: maxV || null,
    lastRegularNumber: maxV ? formatInvoiceNumber(maxV, 10) : null,
    overrideSet: override != null,
    nextValue: next,
    nextNumber: formatInvoiceNumber(next, 10),
  };
}

/** Числовата стойност на редовен номер (или null за специален) — за external validation. */
export function invoiceNumberValue(number: string): number | null {
  return coreValue(number);
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
    // Ако Супер Админ е „влязъл в акаунта" (импърсонация), НЕ оставяме никаква
    // следа в одит лога на фирмата — нито за влизането, нито за корекции.
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    if (jar.get("cda_impersonate")?.value) return;
  } catch { /* извън request scope — продължаваме нормално */ }
  try {
    await prisma.auditLog.create({
      data: { companyId, userId, action, entity, entityId, summary },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
