// ─────────────────────────────────────────────────────────────────────────
// „Моите фирми" — данни за фирмите, които ЕДИН собственик управлява от профила си.
//
// Използва съществуващата връзка CompanyUser (userId ↔ companyId + role). НЕ пипа
// логиката за счетоводни къщи: включва само собствени, самостоятелни фирми
// (isAccountingFirm=false И managedByFirmId=null). Данните са напълно изолирани
// per companyId — тук само ги обобщаваме за управленски изглед.
// ─────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { getInvoiceDisplayStatus, isInvoicePaid } from "@/lib/invoiceStatus";
import { isPayingSubscriber } from "@/lib/billing";

export type MyCompanyKpi = {
  id: string;
  name: string;
  eik: string | null;
  logoUrl: string | null;
  plan: string;
  status: string;
  paymentStatus: string;
  billingMode: string;
  discountPercent: number | null;
  isPaid: boolean;            // реален платен абонат (за MRR/отстъпки)
  documents: number;
  clients: number;
  monthRevenue: number;       // оборот (издадени фактури) за текущия месец
  overdueCount: number;       // просрочени фактури (по display статус)
  receivables: number;        // дължими (неплатени, нефинализирани като платени)
  lastActivity: string | null;
};

/** Where-филтър за самостоятелните фирми на потребителя (не счет. къщи/клиенти). */
function ownedWhere(userId: string) {
  return {
    companyUsers: { some: { userId, role: "owner" } },
    isAccountingFirm: false,
    managedByFirmId: null,
    archivedAt: null,
  } as const;
}

/** Броят на ВЕЧЕ платените самостоятелни фирми на собственика (за отстъпката). */
export async function countPaidOwnedCompanies(userId: string): Promise<number> {
  const companies = await prisma.company.findMany({
    where: ownedWhere(userId),
    select: { subscription: { select: { plan: true, status: true, paymentStatus: true, billingMode: true } } },
  });
  return companies.filter((c) => isPayingSubscriber(c.subscription)).length;
}

/** Пълен управленски обзор на фирмите на собственика (KPI per фирма). */
export async function getMyCompanies(userId: string): Promise<MyCompanyKpi[]> {
  return kpisForWhere(ownedWhere(userId));
}

/**
 * Фирми в ефективния контекст (за „Моите фирми" при Super Admin technical access):
 * фирмите на target собственика + фирмите в същата бизнес група + самата target фирма.
 * Никога не връща личните фирми на Super Admin.
 */
export async function getContextCompanies(opts: { contextUserId: string | null; targetCompanyId: string }): Promise<MyCompanyKpi[]> {
  const target = await prisma.company.findUnique({ where: { id: opts.targetCompanyId }, select: { companyGroupId: true } });
  const groupIds = target?.companyGroupId
    ? (await prisma.company.findMany({ where: { companyGroupId: target.companyGroupId, archivedAt: null }, select: { id: true } })).map((c) => c.id)
    : [];
  const explicitIds = [...new Set([opts.targetCompanyId, ...groupIds])];
  const or: object[] = [{ id: { in: explicitIds }, archivedAt: null }];
  if (opts.contextUserId) or.push(ownedWhere(opts.contextUserId));
  return kpisForWhere({ OR: or });
}

/** Общата заявка + KPI мапинг за произволен where филтър. */
async function kpisForWhere(where: object): Promise<MyCompanyKpi[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const companies = await prisma.company.findMany({
    where,
    select: {
      id: true, name: true, eik: true, logoUrl: true,
      subscription: { select: { plan: true, status: true, paymentStatus: true, billingMode: true, discountPercent: true } },
      _count: { select: { documents: true, clients: true } },
      documents: {
        where: { type: "invoice", deletedAt: null },
        select: { status: true, paidAmount: true, dueDate: true, sentToClientAt: true, issueDate: true, lines: { select: { lineTotal: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Последна активност (най-скорошно посещение) за всички фирми наведнъж.
  const ids = companies.map((c) => c.id);
  const visits = ids.length
    ? await prisma.siteVisit.groupBy({ by: ["companyId"], where: { companyId: { in: ids } }, _max: { createdAt: true } })
    : [];
  const lastVisit = new Map(visits.map((v) => [v.companyId, v._max.createdAt]));

  return companies.map((c) => {
    let monthRevenue = 0, overdueCount = 0, receivables = 0;
    for (const d of c.documents) {
      const total = d.lines.reduce((s, l) => s + l.lineTotal, 0);
      const input = { status: d.status, paidAmount: d.paidAmount, total, dueDate: d.dueDate, sentToClientAt: d.sentToClientAt };
      const ds = getInvoiceDisplayStatus(input, now);
      if (new Date(d.issueDate) >= monthStart) monthRevenue += total;
      if (ds === "overdue") overdueCount++;
      if (ds !== "cancelled" && !isInvoicePaid(input)) receivables += total;
    }
    // Последна активност: по-скорошното от посещение и последно издаден документ.
    const lastDoc = c.documents.reduce<Date | null>((mx, d) => {
      const dt = new Date(d.issueDate);
      return !mx || dt > mx ? dt : mx;
    }, null);
    const lv = lastVisit.get(c.id) ?? null;
    const last = [lv, lastDoc].filter(Boolean).sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ?? null;

    return {
      id: c.id, name: c.name, eik: c.eik, logoUrl: c.logoUrl,
      plan: c.subscription?.plan ?? "free",
      status: c.subscription?.status ?? "active",
      paymentStatus: c.subscription?.paymentStatus ?? "pending",
      billingMode: c.subscription?.billingMode ?? "standard",
      discountPercent: c.subscription?.discountPercent ?? null,
      isPaid: isPayingSubscriber(c.subscription),
      documents: c._count.documents,
      clients: c._count.clients,
      monthRevenue: +monthRevenue.toFixed(2),
      overdueCount,
      receivables: +receivables.toFixed(2),
      lastActivity: last ? (last as Date).toISOString() : null,
    };
  });
}
