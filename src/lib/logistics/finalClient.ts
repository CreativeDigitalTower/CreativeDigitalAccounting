/**
 * Разрешаване на „финалната клиентска фирма" за екрана „Клиенти (логистика)" (§20/§28).
 * Крайните MK клиенти живеят в CRM на MK buyer фирмата (SEM), не на BG продавача (Metal
 * Trade). Единствен source of truth е реалният Client модел — тук само намираме коя фирма
 * държи тези клиенти, спрямо активната фирма. Валидацията е винаги server-side и в
 * рамките на CompanyGroup (без наивно доверие към body).
 */
import { prisma } from "@/lib/prisma";
import { groupCounterparties } from "@/lib/logistics/access";

/**
 * Фирмата, чиито Client записи са крайните клиенти за активната фирма:
 *   - продавач (има export sets) → buyerCompanyId от доставките (SEM), иначе първи
 *     контрагент от групата;
 *   - buyer/самостоятелна фирма → собствените ѝ клиенти.
 */
export async function resolveFinalClientCompanyId(activeCompanyId: string): Promise<string> {
  const withBuyer = await prisma.exportDocumentSet.findFirst({
    where: { companyId: activeCompanyId, deletedAt: null, buyerCompanyId: { not: null } },
    select: { buyerCompanyId: true }, orderBy: { createdAt: "desc" },
  });
  if (withBuyer?.buyerCompanyId) return withBuyer.buyerCompanyId;

  const hasSets = await prisma.exportDocumentSet.count({ where: { companyId: activeCompanyId, deletedAt: null } });
  if (hasSets > 0) {
    const cps = await groupCounterparties(activeCompanyId);
    if (cps[0]) return cps[0].id;
  }
  return activeCompanyId;
}

/** Позволена ли е клиентска фирма за активната: самата тя или свързан контрагент (§28). */
export async function assertClientCompanyInGroup(activeCompanyId: string, clientCompanyId: string): Promise<boolean> {
  if (clientCompanyId === activeCompanyId) return true;
  const cps = await groupCounterparties(activeCompanyId);
  return cps.some((c) => c.id === clientCompanyId);
}
