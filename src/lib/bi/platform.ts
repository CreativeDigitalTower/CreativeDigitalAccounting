import { prisma } from "@/lib/prisma";
import type { Insight, MetricCard, Severity } from "@/lib/bi/overview";
import type { TFunc } from "@/lib/i18n/messages";
import { intlLocale, type Locale } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────────────────
// Executive overview за Super Admin — от реалните данни на платформата.
// Всичко се смята от вече заредените фирми + няколко леки агрегации.
// ─────────────────────────────────────────────────────────────────────────

export type AttentionItem = { severity: Severity; icon: string; text: string; date?: string; href?: string; cta?: string };

export type PlatformOverview = {
  cards: MetricCard[];
  health: { score: number; label: string; tone: Severity; notes: string[] } | null;
  insights: Insight[];
  opportunities: Insight[];
  attention: AttentionItem[];
  registrations: { labels: string[]; data: number[] };
  planDistribution: { label: string; value: number; color: string }[];
};

type FirmStat = { id: string; name: string; totalClients: number; paidClients: number; monthlyCommission: number; firmPlan: string; maxClients: string };
type Payout = { id: string; firmName: string; amount: number; requestedAt: string };
type Lead = { id: string; name: string; plan: string; score?: number; used?: number; limit?: number };

function pct(cur: number, prev: number): number | null { if (prev === 0) return cur === 0 ? 0 : null; return ((cur - prev) / Math.abs(prev)) * 100; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Company = any;

export async function buildPlatformOverview(input: {
  companies: Company[];
  mrr: number; arr: number; payingCount: number; paidCount: number; trialingCount: number;
  awaitingList: { id: string; name: string }[]; conversion: number;
  newThisMonth: number; newPrevMonth: number; active30: number; churnRisk: number;
  firmStats: FirmStat[]; payoutRows: Payout[];
  upgradeOpportunities: Lead[]; hotLeads: Lead[]; inactivePaid: { id: string; name: string; days: number }[];
}, t: TFunc, locale: Locale): Promise<PlatformOverview> {
  const { companies, mrr, arr, payingCount, paidCount, trialingCount, awaitingList, conversion, newThisMonth, newPrevMonth, active30, churnRisk, firmStats, payoutRows, upgradeOpportunities, hotLeads, inactivePaid } = input;
  const now = new Date();
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });
  const money = (v: number) => Math.round(v).toLocaleString(intlLocale(locale)) + " €";
  const planName = (id: string) => { const l = t(`pricing.plans.${id}.name`); return l.startsWith("pricing.") ? id : l; };
  const total = companies.length;
  const freeCount = total - paidCount;
  const arpu = payingCount > 0 ? mrr / payingCount : 0;
  const managedClients = firmStats.reduce((s, f) => s + f.totalClients, 0);
  const expectedCommission = firmStats.reduce((s, f) => s + f.monthlyCommission, 0);

  // ─── Регистрации по месеци (последни 6) ───
  const N = 6;
  const regSeries = new Array(N).fill(0);
  const regLabels: string[] = [];
  for (let i = 0; i < N; i++) { const d = new Date(now.getFullYear(), now.getMonth() - (N - 1) + i, 1); regLabels.push(monthFmt.format(d)); }
  for (const c of companies) {
    const cd = new Date(c.createdAt);
    const diff = (now.getFullYear() - cd.getFullYear()) * 12 + (now.getMonth() - cd.getMonth());
    const idx = N - 1 - diff;
    if (idx >= 0 && idx < N) regSeries[idx]++;
  }

  // ─── Trial изтичащи (до 7 дни) ───
  const trialExpiring = companies
    .filter((c: Company) => c.subscription?.status === "trialing" && c.subscription?.currentPeriodEnd)
    .map((c: Company) => ({ id: c.id, name: c.name, end: new Date(c.subscription.currentPeriodEnd) }))
    .filter((t: { end: Date }) => { const d = Math.ceil((t.end.getTime() - now.getTime()) / 86400000); return d >= 0 && d <= 7; })
    .sort((a: { end: Date }, b: { end: Date }) => a.end.getTime() - b.end.getTime());

  // ─── Леки агрегации: неуспешни имейли + събития по абонаменти (30 дни) ───
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const [failedEmails30, planChanges30, cancellations30] = await Promise.all([
    prisma.emailLog.count({ where: { status: "failed", createdAt: { gte: d30 } } }),
    prisma.subscriptionEvent.count({ where: { type: "plan_change", createdAt: { gte: d30 } } }),
    prisma.subscriptionEvent.count({ where: { OR: [{ type: "expiry" }, { type: "status_change", status: "cancelled" }], createdAt: { gte: d30 } } }),
  ]);

  // ─── План разпределение ───
  const planCounts: Record<string, number> = { free: 0, start: 0, business: 0, pro: 0 };
  for (const c of companies) planCounts[c.subscription?.plan ?? "free"] = (planCounts[c.subscription?.plan ?? "free"] ?? 0) + 1;
  const planColors: Record<string, string> = { free: "var(--muted)", start: "var(--navy)", business: "var(--emerald)", pro: "var(--brass)" };
  const planDistribution = (["free", "start", "business", "pro"] as const).map((p) => ({ label: planName(p), value: planCounts[p] ?? 0, color: planColors[p] }));
  const topPaidPlan = (["pro", "business", "start"] as const).map((p) => ({ p, n: planCounts[p] ?? 0 })).sort((a, b) => b.n - a.n)[0];

  // ─── KPI карти ───
  const flat = (key: string, label: string, value: number, money: boolean, spark: number[] = []): MetricCard =>
    ({ key, label, value, money, deltaPct: null, direction: "flat", goodWhenUp: true, caption: t("platformbi.caption.current"), spark });
  const regDelta = pct(newThisMonth, newPrevMonth);
  const cards: MetricCard[] = [
    flat("total", t("platformbi.card.total"), total, false, regSeries),
    { key: "new", label: t("platformbi.card.new"), value: newThisMonth, money: false, deltaPct: regDelta, direction: newThisMonth > newPrevMonth ? "up" : newThisMonth < newPrevMonth ? "down" : "flat", goodWhenUp: true, caption: regDelta == null ? t("platformbi.caption.noPeriod") : (newThisMonth >= newPrevMonth ? t("platformbi.caption.better") : t("platformbi.caption.worse")), spark: regSeries },
    flat("active", t("platformbi.card.active"), active30, false),
    flat("paid", t("platformbi.card.paid"), payingCount, false),
    flat("free", t("platformbi.card.free"), freeCount, false),
    flat("trial", t("platformbi.card.trial"), trialingCount, false),
    flat("mrr", t("platformbi.card.mrr"), mrr, true),
    flat("arr", t("platformbi.card.arr"), arr, true),
    flat("arpu", t("platformbi.card.arpu"), arpu, true),
    flat("conv", t("platformbi.card.conv"), conversion, false),
    flat("awaiting", t("platformbi.card.awaiting"), awaitingList.length, false),
    flat("firms", t("platformbi.card.firms"), firmStats.length, false),
    flat("managed", t("platformbi.card.managed"), managedClients, false),
    flat("commission", t("platformbi.card.commission"), expectedCommission, true),
  ];
  // маркер за проценти (conversion) — MetricCard няма percent флаг; показваме като число
  const convCard = cards.find((c) => c.key === "conv"); if (convCard) convCard.caption = t("platformbi.caption.conv", { paid: paidCount, total });

  // ─── Health score (документирано формиране) ───
  let health: PlatformOverview["health"] = null;
  if (total >= 3) {
    let score = 100; const notes: string[] = [];
    const activeRatio = total ? active30 / total : 0;
    if (activeRatio < 0.3) { score -= 20; notes.push(t("platformbi.health.lowActivity")); }
    else if (activeRatio < 0.5) { score -= 10; notes.push(t("platformbi.health.modActivity")); }
    if (total >= 10) { if (conversion < 3) { score -= 12; notes.push(t("platformbi.health.lowConv")); } else if (conversion < 6) score -= 6; }
    if (regDelta != null && newThisMonth < newPrevMonth) { score -= 8; notes.push(t("platformbi.health.regDrop")); }
    if (awaitingList.length > 0) { score -= Math.min(15, awaitingList.length * 3); notes.push(t("platformbi.health.awaitingN", { n: awaitingList.length })); }
    if (payingCount > 0 && churnRisk / payingCount > 0.3) { score -= 12; notes.push(t("platformbi.health.churn")); }
    if (failedEmails30 > 0) { score -= Math.min(10, failedEmails30); notes.push(t("platformbi.health.failedN", { n: failedEmails30 })); }
    if (trialExpiring.length > 0) { score -= Math.min(8, trialExpiring.length * 2); notes.push(t("platformbi.health.trialN", { n: trialExpiring.length })); }
    if (notes.length === 0) notes.push(t("platformbi.health.allNorm"));
    score = Math.max(0, Math.min(100, Math.round(score)));
    const tone: Severity = score >= 85 ? "good" : score >= 65 ? "ok" : score >= 45 ? "attention" : "critical";
    const label = score >= 85 ? t("platformbi.health.labelExcellent") : score >= 65 ? t("platformbi.health.labelGood") : score >= 45 ? t("platformbi.health.labelAttention") : t("platformbi.health.labelCritical");
    health = { score, tone, label, notes };
  }

  // ─── Insights ───
  const insights: Insight[] = [];
  if (regDelta != null && Math.abs(regDelta) >= 5) insights.push({ icon: regDelta >= 0 ? "trending-up" : "trending-down", severity: regDelta >= 0 ? "good" : "attention", text: t("platformbi.insight.reg", { pct: Math.abs(Math.round(regDelta)), dir: regDelta >= 0 ? t("platformbi.insight.regHigher") : t("platformbi.insight.regLower") }), href: "/dashboard/admin/businesses", cta: t("platformbi.insight.ctaBusinesses") });
  if (total >= 10) insights.push({ icon: "user", severity: conversion >= 6 ? "good" : "attention", text: t("platformbi.insight.conv", { conv: conversion, paid: paidCount, total }) });
  if (awaitingList.length > 0) insights.push({ icon: "clock", severity: "attention", text: t("platformbi.insight.awaiting", { n: awaitingList.length }), href: "#awaiting", cta: t("platformbi.insight.ctaConfirmPayments") });
  if (trialExpiring.length > 0) insights.push({ icon: "clock", severity: "attention", text: t("platformbi.insight.trialExp", { n: trialExpiring.length }) });
  // Принос на счетоводните къщи към новите фирми този месец
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const managedNew = companies.filter((c: Company) => c.managedByFirmId && new Date(c.createdAt) >= mStart).length;
  if (newThisMonth > 0 && managedNew > 0) insights.push({ icon: "trending-up", severity: "good", text: t("platformbi.insight.managed", { pct: Math.round((managedNew / newThisMonth) * 100) }), href: "#firms", cta: t("platformbi.insight.ctaFirms") });
  if (topPaidPlan && topPaidPlan.n > 0) insights.push({ icon: "check", severity: "good", text: t("platformbi.insight.topPlan", { plan: planName(topPaidPlan.p), n: topPaidPlan.n }) });
  if (planChanges30 > 0) insights.push({ icon: "trending-up", severity: "ok", text: t("platformbi.insight.planChanges", { n: planChanges30 }) });
  if (cancellations30 > 0) insights.push({ icon: "trending-down", severity: "attention", text: t("platformbi.insight.cancellations", { n: cancellations30 }) });
  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: t("platformbi.insight.none") });

  // ─── Възможности ───
  const opportunities: Insight[] = [];
  for (const o of upgradeOpportunities.slice(0, 3)) opportunities.push({ icon: "bulb", severity: "good", text: t("platformbi.opp.nearLimit", { name: o.name, used: o.used ?? 0, limit: o.limit === Infinity ? "∞" : (o.limit ?? 0) }), href: "/dashboard/admin/businesses", cta: t("platformbi.opp.ctaOpen") });
  for (const l of hotLeads.filter((x) => (x.score ?? 0) >= 70).slice(0, 2)) opportunities.push({ icon: "bulb", severity: "good", text: t("platformbi.opp.hotLead", { name: l.name, score: l.score ?? 0 }) });
  const firmsAtLimit = firmStats.filter((f) => f.maxClients !== "∞" && f.totalClients >= Number(f.maxClients) * 0.9);
  for (const f of firmsAtLimit.slice(0, 2)) opportunities.push({ icon: "bulb", severity: "ok", text: t("platformbi.opp.firmNearLimit", { name: f.name, limit: f.maxClients }), href: "#firms", cta: t("platformbi.opp.ctaView") });
  if (opportunities.length === 0) opportunities.push({ icon: "bulb", severity: "ok", text: t("platformbi.opp.none") });

  // ─── Изисква внимание ───
  const attention: AttentionItem[] = [];
  for (const a of awaitingList.slice(0, 6)) attention.push({ severity: "attention", icon: "alert", text: t("platformbi.attention.awaiting", { name: a.name }), href: "#awaiting", cta: t("platformbi.attention.ctaConfirm") });
  for (const p of payoutRows.slice(0, 6)) attention.push({ severity: "attention", icon: "alert", text: t("platformbi.attention.payout", { name: p.firmName, amount: money(p.amount) }), date: new Date(p.requestedAt).toLocaleDateString(intlLocale(locale)), href: "#payouts", cta: t("platformbi.attention.ctaProcess") });
  for (const tr of trialExpiring.slice(0, 5)) attention.push({ severity: "attention", icon: "clock", text: t("platformbi.attention.trial", { name: tr.name }), date: tr.end.toLocaleDateString(intlLocale(locale)), href: "/dashboard/admin/businesses", cta: t("platformbi.attention.ctaView") });
  for (const i of inactivePaid.slice(0, 4)) attention.push({ severity: "critical", icon: "alert", text: t("platformbi.attention.inactivePaid", { days: i.days, name: i.name }), href: "/dashboard/admin/businesses", cta: t("platformbi.attention.ctaContact") });
  if (failedEmails30 > 0) attention.push({ severity: "attention", icon: "alert", text: t("platformbi.attention.failed", { n: failedEmails30 }), href: "/dashboard/admin/emails", cta: t("platformbi.attention.ctaCheck") });
  if (attention.length === 0) attention.push({ severity: "good", icon: "check", text: t("platformbi.attention.none") });

  return { cards, health, insights, opportunities, attention, registrations: { labels: regLabels, data: regSeries }, planDistribution };
}
