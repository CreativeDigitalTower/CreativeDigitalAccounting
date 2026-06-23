import { prisma } from "@/lib/prisma";
import { DOC_PREFIXES, FREE_PLAN_LIMIT, getYearMonth } from "@/lib/constants";
import { DocumentType } from "@prisma/client";

export async function generateDocumentNumber(
  companyId: string,
  type: DocumentType
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = DOC_PREFIXES[type] ?? "DOC";

  const count = await prisma.document.count({
    where: {
      companyId,
      type,
      number: { startsWith: `${prefix}-${year}-` },
    },
  });

  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function checkInvoiceLimit(companyId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (subscription && subscription.plan !== "free") return true;

  const yearMonth = getYearMonth();
  const counter = await prisma.usageCounter.findUnique({
    where: { companyId_yearMonth: { companyId, yearMonth } },
  });

  return (counter?.documentsIssuedCount ?? 0) < FREE_PLAN_LIMIT;
}

export async function incrementInvoiceCounter(companyId: string) {
  const yearMonth = getYearMonth();
  await prisma.usageCounter.upsert({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    update: { documentsIssuedCount: { increment: 1 } },
    create: { companyId, yearMonth, documentsIssuedCount: 1 },
  });
}
