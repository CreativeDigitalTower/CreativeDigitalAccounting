import { prisma } from "@/lib/prisma";
import { planPrice, commissionRate, isPaidClientPlan, COMMISSION_PAYOUT_THRESHOLD, type PlanId } from "@/lib/constants";
import { APP_URL } from "@/lib/email/templates";

export type PartnerStats = {
  partnerCode: string | null;
  referralLink: string | null;
  totalClients: number;
  startClients: number;
  paidClients: number;
  conversion: number;        // % платени от общо
  ratePercent: number;       // текущ партньорски процент
  monthlyCommission: number; // очаквана месечна комисионна (EUR)
  yearlyCommission: number;  // очаквана годишна комисионна (EUR)
  paidTotal: number;         // общо изплатена комисионна
  pendingRequests: number;   // сума на чакащи заявки за изплащане
  availableBalance: number;  // налична за заявка (оценка — виж TODO по-долу)
  canRequestPayout: boolean;
  threshold: number;
};

/**
 * Изчислява партньорската статистика на счетоводна къща.
 * Забележка: очакваните комисионни се смятат на живо от текущите платени клиенти.
 * TODO: реалното месечно начисляване на комисионна изисква периодична задача (cron),
 * която да натрупва баланс за изплащане; тук показваме текуща оценка.
 */
export async function computeFirmPartnerStats(firm: { id: string; partnerCode: string | null; partnerPercentOverride: number | null; commissionPaidTotal: number }): Promise<PartnerStats> {
  const clients = await prisma.company.findMany({
    where: { managedByFirmId: firm.id, archivedAt: null },
    select: { id: true, subscription: { select: { plan: true, paymentStatus: true } } },
  });

  let paidClients = 0;
  let monthlyCommission = 0;
  const paidList: { plan: PlanId }[] = [];
  for (const c of clients) {
    const plan = (c.subscription?.plan ?? "free") as PlanId;
    const paid = isPaidClientPlan(plan) && c.subscription?.paymentStatus === "received";
    if (paid) { paidClients++; paidList.push({ plan }); }
  }
  const rate = commissionRate(paidClients, firm.partnerPercentOverride);
  for (const p of paidList) monthlyCommission += planPrice(p.plan) * rate;

  const totalClients = clients.length;
  const startClients = totalClients - paidClients;
  const conversion = totalClients ? Math.round((paidClients / totalClients) * 100) : 0;

  const pending = await prisma.commissionPayout.aggregate({
    where: { firmId: firm.id, status: "requested" }, _sum: { amount: true },
  });
  const pendingRequests = pending._sum.amount ?? 0;

  // Оценка на наличния баланс за заявка (виж TODO по-горе).
  const availableBalance = Math.max(0, +(monthlyCommission - pendingRequests).toFixed(2));

  return {
    partnerCode: firm.partnerCode,
    referralLink: firm.partnerCode ? `${APP_URL}/register?partner=${firm.partnerCode}` : null,
    totalClients,
    startClients,
    paidClients,
    conversion,
    ratePercent: Math.round(rate * 100),
    monthlyCommission: +monthlyCommission.toFixed(2),
    yearlyCommission: +(monthlyCommission * 12).toFixed(2),
    paidTotal: firm.commissionPaidTotal,
    pendingRequests: +pendingRequests.toFixed(2),
    availableBalance,
    canRequestPayout: availableBalance >= COMMISSION_PAYOUT_THRESHOLD,
    threshold: COMMISSION_PAYOUT_THRESHOLD,
  };
}

/** Генерира уникален партньорски код. */
export async function generatePartnerCode(seed: string): Promise<string> {
  const base = (seed.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 4) || "CDA").toUpperCase();
  for (let i = 0; i < 8; i++) {
    const code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.company.findUnique({ where: { partnerCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  return `P${Date.now().toString(36).toUpperCase()}`;
}
