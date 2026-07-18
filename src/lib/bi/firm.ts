import type { Insight, MetricCard, Severity } from "@/lib/bi/overview";
import type { PartnerStats } from "@/lib/partner";
import type { TFunc } from "@/lib/i18n/messages";

// ─────────────────────────────────────────────────────────────────────────
// Accounting Firm Executive Overview — от реалните данни на всички клиенти.
// ─────────────────────────────────────────────────────────────────────────

export type EnrichedClient = {
  id: string; name: string; eik: string | null; vatRegistered: boolean; city: string | null;
  planLabel: string; plan: string; status: "active" | "inactive" | "paid";
  revenue: number; expenses: number; profit: number; docs: number; invoices: number;
  overdue: number; unpaid: number; vatState: "" | "near" | "over";
  lastActivityDays: number | null; revThisMonth: number; revLastMonth: number; isNewThisMonth: boolean;
  health: number; healthTone: Severity;
};

export type FirmTask = { severity: Severity; icon: string; text: string; clientId?: string; href?: string; cta?: string };
export type FirmOverview = {
  cards: MetricCard[];
  healthDist: { good: number; ok: number; attention: number; critical: number };
  forecast: { revenue: number; expenses: number; profit: number; vat: number; documents: number; progressPct: number } | null;
  insights: Insight[];
  opportunities: Insight[];
  tasks: FirmTask[];
};

/** Преводено име на план по id (реюз на pricing namespace). */
const planName = (t: TFunc, id: string) => t(`pricing.plans.${id}.name`);

/** Business Health на клиентска фирма — само от реални показатели. */
export function clientHealth(c: { profit: number; revenue: number; overdue: number; unpaid: number; lastActivityDays: number | null; vatState: string }): { score: number; tone: Severity } {
  let score = 100;
  const margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
  if (c.revenue === 0) score -= 20;
  if (c.profit < 0) score -= 30; else if (margin < 10) score -= 10;
  if (c.overdue > 0) score -= Math.min(25, c.overdue * 5);
  if (c.unpaid > 0) score -= 6;
  if (c.vatState === "over") score -= 8;
  if (c.lastActivityDays != null) { if (c.lastActivityDays > 30) score -= 15; else if (c.lastActivityDays > 14) score -= 8; }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tone: Severity = score >= 85 ? "good" : score >= 65 ? "ok" : score >= 45 ? "attention" : "critical";
  return { score, tone };
}

/** Кратко Executive Summary за клиент — редове, съставени от реални сигнали. */
export function clientSummary(c: EnrichedClient, t: TFunc): string[] {
  const out: string[] = [];
  if (c.revThisMonth > c.revLastMonth && c.revLastMonth > 0) out.push(t("firmbi.summary.revUp"));
  else if (c.revThisMonth < c.revLastMonth) out.push(t("firmbi.summary.revDown"));
  if (c.profit < 0) out.push(t("firmbi.summary.expExceed")); else if (c.revenue > 0 && c.profit / c.revenue < 0.1) out.push(t("firmbi.summary.lowMargin"));
  if (c.overdue > 0) out.push(t("firmbi.summary.overdueN", { n: c.overdue }));
  else if (c.unpaid > 0) out.push(t("firmbi.summary.hasUnpaid")); else out.push(t("firmbi.summary.noOverdue"));
  if (c.lastActivityDays != null && c.lastActivityDays > 30) out.push(t("firmbi.summary.inactiveDays", { n: c.lastActivityDays }));
  if (c.vatState === "over") out.push(t("firmbi.summary.vatOver"));
  else if (c.vatState === "near") out.push(t("firmbi.summary.vatNear"));
  const sug = upgradeSuggestion(c);
  if (sug) out.push(t("firmbi.summary.candidate", { plan: planName(t, sug) }));
  return out;
}

/** Предложение за по-висок план (id), изчислено само от оборота/активността. */
export function upgradeSuggestion(c: EnrichedClient): "pro" | "business" | null {
  if (c.status === "paid") return null;
  if (c.revenue >= 60000 || c.vatState === "over") return "pro";
  if (c.revenue >= 20000 || c.invoices >= 60) return "business";
  return null;
}

export function buildFirmOverview(input: { clients: EnrichedClient[]; monthToDate: { revenue: number; expenses: number; vat: number; progressPct: number }; partner: PartnerStats; pendingPayoutCount: number }, t: TFunc, locale: string): FirmOverview {
  const { clients, monthToDate, partner, pendingPayoutCount } = input;
  const money = (v: number) => Math.round(v).toLocaleString(locale) + " €";
  const total = clients.length;
  const paid = clients.filter((c) => c.status === "paid").length;
  const startClients = clients.filter((c) => c.status !== "paid").length;
  const active = clients.filter((c) => c.lastActivityDays != null && c.lastActivityDays <= 30).length;
  const newThisMonth = clients.filter((c) => c.isNewThisMonth).length;
  const conversion = total ? Math.round((paid / total) * 100) : 0;
  const revenue = clients.reduce((s, c) => s + c.revenue, 0);
  const expenses = clients.reduce((s, c) => s + c.expenses, 0);
  const profit = revenue - expenses;
  const docs = clients.reduce((s, c) => s + c.docs, 0);
  const unpaidCount = clients.reduce((s, c) => s + (c.unpaid > 0 ? 1 : 0), 0);
  const overdueCount = clients.reduce((s, c) => s + c.overdue, 0);

  // Прогноза (run-rate за текущия месец)
  let forecast: FirmOverview["forecast"] = null;
  if (monthToDate.progressPct > 2) {
    const p = (v: number) => v / (monthToDate.progressPct / 100);
    forecast = { revenue: p(monthToDate.revenue), expenses: p(monthToDate.expenses), profit: p(monthToDate.revenue - monthToDate.expenses), vat: p(monthToDate.vat), documents: 0, progressPct: monthToDate.progressPct };
  }

  const flat = (key: string, value: number, m: boolean, caption = t("firmbi.card.captionFlat")): MetricCard =>
    ({ key, label: t(`firmbi.card.${key}`), value, money: m, deltaPct: null, direction: "flat", goodWhenUp: true, caption, spark: [] });
  const cards: MetricCard[] = [
    flat("total", total, false),
    flat("active", active, false),
    flat("new", newThisMonth, false),
    flat("start", startClients, false),
    flat("paid", paid, false),
    flat("conv", conversion, false, t("firmbi.card.captionConv", { paid, total })),
    flat("revenue", revenue, true),
    flat("expenses", expenses, true),
    flat("profit", profit, true),
    flat("vat", forecast?.vat ?? 0, true),
    flat("docs", docs, false),
    flat("unpaid", unpaidCount, false),
    flat("overdue", overdueCount, false),
    flat("commission", partner.monthlyCommission, true),
    flat("paidcomm", partner.paidTotal, true),
    flat("pending", pendingPayoutCount, false),
  ];

  const healthDist = { good: 0, ok: 0, attention: 0, critical: 0 };
  for (const c of clients) healthDist[c.healthTone]++;

  // ─── Insights (портфейл) ───
  const insights: Insight[] = [];
  const growing = clients.filter((c) => c.revLastMonth > 0 && c.revThisMonth > c.revLastMonth).length;
  const declining = clients.filter((c) => c.revThisMonth < c.revLastMonth).length;
  if (growing > 0 || declining > 0) insights.push({ icon: growing >= declining ? "trending-up" : "trending-down", severity: growing >= declining ? "good" : "attention", text: t("firmbi.insight.growDecline", { growing, declining }) });
  const critical = clients.filter((c) => c.healthTone === "critical").length;
  if (critical > 0) insights.push({ icon: "alert", severity: "critical", text: t("firmbi.insight.critical", { n: critical }) });
  if (overdueCount > 0) insights.push({ icon: "clock", severity: "attention", text: t("firmbi.insight.overdue", { n: overdueCount }) });
  if (partner.monthlyCommission > 0) insights.push({ icon: "trending-up", severity: "good", text: t("firmbi.insight.commission", { amount: money(partner.monthlyCommission) }) });
  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: t("firmbi.insight.allGood") });

  // ─── Възможности (надграждания) ───
  const opportunities: Insight[] = [];
  for (const c of clients) { const s = upgradeSuggestion(c); if (s) opportunities.push({ icon: "bulb", severity: "good", text: t("firmbi.opp.candidate", { name: c.name, plan: planName(t, s), amount: money(c.revenue) }) }); }
  if (opportunities.length === 0) opportunities.push({ icon: "bulb", severity: "ok", text: t("firmbi.opp.none") });
  const trimmedOpp = opportunities.slice(0, 6);

  // ─── Task Center (Изисква внимание) ───
  const tasks: FirmTask[] = [];
  for (const c of clients.filter((x) => x.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 6))
    tasks.push({ severity: c.overdue >= 5 ? "critical" : "attention", icon: "clock", text: t("firmbi.task.overdue", { name: c.name, n: c.overdue, amount: money(c.unpaid) }), clientId: c.id, cta: t("firmbi.task.ctaGo") });
  for (const c of clients.filter((x) => x.lastActivityDays != null && x.lastActivityDays > 30).sort((a, b) => (b.lastActivityDays ?? 0) - (a.lastActivityDays ?? 0)).slice(0, 5))
    tasks.push({ severity: "attention", icon: "alert", text: t("firmbi.task.inactive", { name: c.name, n: c.lastActivityDays ?? 0 }), clientId: c.id, cta: t("firmbi.task.ctaGo") });
  for (const c of clients.filter((x) => x.vatState === "over").slice(0, 4))
    tasks.push({ severity: "attention", icon: "alert", text: t("firmbi.task.vatOver", { name: c.name }), clientId: c.id, cta: t("firmbi.task.ctaGo") });
  if (pendingPayoutCount > 0) tasks.push({ severity: "ok", icon: "bulb", text: t("firmbi.task.payouts", { n: pendingPayoutCount }), href: "#partner", cta: t("firmbi.task.ctaSee") });
  if (tasks.length === 0) tasks.push({ severity: "good", icon: "check", text: t("firmbi.task.none") });

  return { cards, healthDist, forecast, insights, opportunities: trimmedOpp, tasks };
}
