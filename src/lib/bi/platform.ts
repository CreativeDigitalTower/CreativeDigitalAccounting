import { prisma } from "@/lib/prisma";
import type { Insight, MetricCard, Severity } from "@/lib/bi/overview";

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

const MONTHS = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
const money = (v: number) => Math.round(v).toLocaleString("bg-BG") + " €";
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
}): Promise<PlatformOverview> {
  const { companies, mrr, arr, payingCount, paidCount, trialingCount, awaitingList, conversion, newThisMonth, newPrevMonth, active30, churnRisk, firmStats, payoutRows, upgradeOpportunities, hotLeads, inactivePaid } = input;
  const now = new Date();
  const total = companies.length;
  const freeCount = total - paidCount;
  const arpu = payingCount > 0 ? mrr / payingCount : 0;
  const managedClients = firmStats.reduce((s, f) => s + f.totalClients, 0);
  const expectedCommission = firmStats.reduce((s, f) => s + f.monthlyCommission, 0);

  // ─── Регистрации по месеци (последни 6) ───
  const N = 6;
  const regSeries = new Array(N).fill(0);
  const regLabels: string[] = [];
  for (let i = 0; i < N; i++) { const d = new Date(now.getFullYear(), now.getMonth() - (N - 1) + i, 1); regLabels.push(MONTHS[d.getMonth()]); }
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
  const planLabels: Record<string, string> = { free: "Безплатен", start: "Старт", business: "Бизнес", pro: "Про" };
  const planDistribution = (["free", "start", "business", "pro"] as const).map((p) => ({ label: planLabels[p], value: planCounts[p] ?? 0, color: planColors[p] }));
  const topPaidPlan = (["pro", "business", "start"] as const).map((p) => ({ p, n: planCounts[p] ?? 0 })).sort((a, b) => b.n - a.n)[0];

  // ─── KPI карти ───
  const flat = (key: string, label: string, value: number, money: boolean, spark: number[] = []): MetricCard =>
    ({ key, label, value, money, deltaPct: null, direction: "flat", goodWhenUp: true, caption: "текуща стойност", spark });
  const regDelta = pct(newThisMonth, newPrevMonth);
  const cards: MetricCard[] = [
    flat("total", "Регистрирани фирми", total, false, regSeries),
    { key: "new", label: "Нови този месец", value: newThisMonth, money: false, deltaPct: regDelta, direction: newThisMonth > newPrevMonth ? "up" : newThisMonth < newPrevMonth ? "down" : "flat", goodWhenUp: true, caption: regDelta == null ? "няма съпоставим период" : (newThisMonth >= newPrevMonth ? "по-добре от миналия месец" : "по-слабо от миналия месец"), spark: regSeries },
    flat("active", "Активни (30 дни)", active30, false),
    flat("paid", "Платени клиенти", payingCount, false),
    flat("free", "Безплатни клиенти", freeCount, false),
    flat("trial", "Trial клиенти", trialingCount, false),
    flat("mrr", "MRR (месечен приход)", mrr, true),
    flat("arr", "ARR (годишен приход)", arr, true),
    flat("arpu", "Среден приход/клиент", arpu, true),
    flat("conv", "Конверсия към платен", conversion, false),
    flat("awaiting", "Неплатени заявки", awaitingList.length, false),
    flat("firms", "Счетоводни къщи", firmStats.length, false),
    flat("managed", "Управлявани клиенти", managedClients, false),
    flat("commission", "Очаквани комисионни", expectedCommission, true),
  ];
  // маркер за проценти (conversion) — MetricCard няма percent флаг; показваме като число
  const convCard = cards.find((c) => c.key === "conv"); if (convCard) convCard.caption = `${paidCount} платени от ${total} фирми`;

  // ─── Health score (документирано формиране) ───
  let health: PlatformOverview["health"] = null;
  if (total >= 3) {
    let score = 100; const notes: string[] = [];
    const activeRatio = total ? active30 / total : 0;
    if (activeRatio < 0.3) { score -= 20; notes.push("Ниска активност на фирмите (под 30%)."); }
    else if (activeRatio < 0.5) { score -= 10; notes.push("Умерена активност на фирмите."); }
    if (total >= 10) { if (conversion < 3) { score -= 12; notes.push("Ниска конверсия към платен план."); } else if (conversion < 6) score -= 6; }
    if (regDelta != null && newThisMonth < newPrevMonth) { score -= 8; notes.push("Спад в новите регистрации спрямо миналия месец."); }
    if (awaitingList.length > 0) { score -= Math.min(15, awaitingList.length * 3); notes.push(`${awaitingList.length} неплатени заявки за абонамент.`); }
    if (payingCount > 0 && churnRisk / payingCount > 0.3) { score -= 12; notes.push("Висок дял платени фирми без активност (риск от отлив)."); }
    if (failedEmails30 > 0) { score -= Math.min(10, failedEmails30); notes.push(`${failedEmails30} неуспешни имейла (30 дни).`); }
    if (trialExpiring.length > 0) { score -= Math.min(8, trialExpiring.length * 2); notes.push(`${trialExpiring.length} trial акаунта изтичат скоро.`); }
    if (notes.length === 0) notes.push("Всички ключови показатели са в норма.");
    score = Math.max(0, Math.min(100, Math.round(score)));
    const tone: Severity = score >= 85 ? "good" : score >= 65 ? "ok" : score >= 45 ? "attention" : "critical";
    const label = score >= 85 ? "Отлично състояние на платформата." : score >= 65 ? "Добро състояние с потенциал." : score >= 45 ? "Изисква внимание." : "Критично — нужни са действия.";
    health = { score, tone, label, notes };
  }

  // ─── Insights ───
  const insights: Insight[] = [];
  if (regDelta != null && Math.abs(regDelta) >= 5) insights.push({ icon: regDelta >= 0 ? "trending-up" : "trending-down", severity: regDelta >= 0 ? "good" : "attention", text: `Регистрациите са с ${Math.abs(Math.round(regDelta))}% ${regDelta >= 0 ? "по-високи" : "по-ниски"} спрямо миналия месец.`, href: "/dashboard/admin/businesses", cta: "Виж фирмите" });
  if (total >= 10) insights.push({ icon: "user", severity: conversion >= 6 ? "good" : "attention", text: `Конверсията към платен план е ${conversion}% (${paidCount} от ${total}).` });
  if (awaitingList.length > 0) insights.push({ icon: "clock", severity: "attention", text: `${awaitingList.length} фирми са поискали платен план, но нямат отчетено плащане.`, href: "#awaiting", cta: "Потвърди плащания" });
  if (trialExpiring.length > 0) insights.push({ icon: "clock", severity: "attention", text: `${trialExpiring.length} trial акаунта изтичат през следващите 7 дни.` });
  // Принос на счетоводните къщи към новите фирми този месец
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const managedNew = companies.filter((c: Company) => c.managedByFirmId && new Date(c.createdAt) >= mStart).length;
  if (newThisMonth > 0 && managedNew > 0) insights.push({ icon: "trending-up", severity: "good", text: `Счетоводните къщи са довели ${Math.round((managedNew / newThisMonth) * 100)}% от новите фирми този месец.`, href: "#firms", cta: "Счетоводни къщи" });
  if (topPaidPlan && topPaidPlan.n > 0) insights.push({ icon: "check", severity: "good", text: `Най-често избираният платен план е ${planLabels[topPaidPlan.p]} (${topPaidPlan.n} фирми).` });
  if (planChanges30 > 0) insights.push({ icon: "trending-up", severity: "ok", text: `${planChanges30} промени по абонаменти през последните 30 дни.` });
  if (cancellations30 > 0) insights.push({ icon: "trending-down", severity: "attention", text: `${cancellations30} отказани/изтекли абонамента през последните 30 дни.` });
  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: "Все още няма достатъчно данни за надежден анализ." });

  // ─── Възможности ───
  const opportunities: Insight[] = [];
  for (const o of upgradeOpportunities.slice(0, 3)) opportunities.push({ icon: "bulb", severity: "good", text: `${o.name} е близо до лимита на плана (${o.used}/${o.limit === Infinity ? "∞" : o.limit}) — вероятен ъпгрейд.`, href: "/dashboard/admin/businesses", cta: "Отвори" });
  for (const l of hotLeads.filter((x) => (x.score ?? 0) >= 70).slice(0, 2)) opportunities.push({ icon: "bulb", severity: "good", text: `Горещ lead: ${l.name} (score ${l.score}/100) — готов за платен план.` });
  const firmsAtLimit = firmStats.filter((f) => f.maxClients !== "∞" && f.totalClients >= Number(f.maxClients) * 0.9);
  for (const f of firmsAtLimit.slice(0, 2)) opportunities.push({ icon: "bulb", severity: "ok", text: `Счетоводна къща „${f.name}" наближава лимита от ${f.maxClients} клиента — потенциал за по-висок план.`, href: "#firms", cta: "Виж" });
  if (opportunities.length === 0) opportunities.push({ icon: "bulb", severity: "ok", text: "Продължавайте да наблюдавате — възможностите ще се появят с натрупване на данни." });

  // ─── Изисква внимание ───
  const attention: AttentionItem[] = [];
  for (const a of awaitingList.slice(0, 6)) attention.push({ severity: "attention", icon: "alert", text: `Неплатена заявка за абонамент — ${a.name}`, href: "#awaiting", cta: "Потвърди" });
  for (const p of payoutRows.slice(0, 6)) attention.push({ severity: "attention", icon: "alert", text: `Заявка за изплащане на комисионна — ${p.firmName} (${money(p.amount)})`, date: new Date(p.requestedAt).toLocaleDateString("bg-BG"), href: "#payouts", cta: "Обработи" });
  for (const t of trialExpiring.slice(0, 5)) attention.push({ severity: "attention", icon: "clock", text: `Trial изтича скоро — ${t.name}`, date: t.end.toLocaleDateString("bg-BG"), href: "/dashboard/admin/businesses", cta: "Виж" });
  for (const i of inactivePaid.slice(0, 4)) attention.push({ severity: "critical", icon: "alert", text: `Платена фирма без активност ${i.days} дни — ${i.name}`, href: "/dashboard/admin/businesses", cta: "Свържи се" });
  if (failedEmails30 > 0) attention.push({ severity: "attention", icon: "alert", text: `${failedEmails30} неуспешни имейла през последните 30 дни`, href: "/dashboard/admin/emails", cta: "Провери" });
  if (attention.length === 0) attention.push({ severity: "good", icon: "check", text: "Няма събития, изискващи внимание в момента." });

  return { cards, health, insights, opportunities, attention, registrations: { labels: regLabels, data: regSeries }, planDistribution };
}
