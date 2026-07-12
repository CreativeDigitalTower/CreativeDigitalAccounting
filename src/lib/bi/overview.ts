import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────
// Actionable Business Intelligence — превръща суровите данни в изводи.
// Всичко се смята от реалните данни на фирмата (фактури, разходи, клиенти).
// ─────────────────────────────────────────────────────────────────────────

export type Severity = "good" | "ok" | "attention" | "critical";
// i18n: генераторите подават преводни ключове + payload (не финален текст).
// text/cta/label/caption остават за компоненти, които все още не са ключови.
export type Insight = {
  icon: string; severity: Severity; text?: string; href?: string; cta?: string;
  key?: string; vars?: Record<string, string | number>; amount?: number; refKey?: string; ctaKey?: string;
};
export type MetricCard = {
  key: string;
  label?: string;            // fallback текст (bg), ако няма labelKey
  labelKey?: string;         // преводен ключ за етикета
  value: number;
  money: boolean;
  deltaPct: number | null;   // спрямо предходния месец
  direction: "up" | "down" | "flat";
  goodWhenUp: boolean;       // за оцветяване (приходи ↑ добре, разходи ↑ зле)
  caption?: string;          // fallback текст (bg)
  captionKey?: string;       // преводен ключ (напр. bi.caption.better)
  captionRefKey?: string;    // ключ за {ref} (напр. bi.ref.lastMonth)
  spark: number[];           // микрографика (последни месеци)
};

export type BusinessOverview = {
  hasData: boolean;
  monthsLabels: string[];
  revenueSeries: number[];
  expenseSeries: number[];
  profitSeries: number[];
  cards: MetricCard[];
  health: { score: number; label: string; labelKey: string; tone: Severity };
  insights: Insight[];
  risks: Insight[];
  opportunities: Insight[];
  forecast: { revenue: number; expenses: number; profit: number; vat: number; documents: number; progressPct: number };
  topClient: { name: string; sharePct: number } | null;
};

const MONTHS_BG = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null; // няма база за сравнение
  return ((cur - prev) / Math.abs(prev)) * 100;
}
function dir(cur: number, prev: number): "up" | "down" | "flat" {
  if (cur > prev) return "up";
  if (cur < prev) return "down";
  return "flat";
}

export async function computeBusinessOverview(companyId: string): Promise<BusinessOverview> {
  const now = new Date();
  const N = 6; // брой месеца назад (вкл. текущия)
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (N - 1), 1);
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const buckets: { key: string; label: string; y: number; m: number }[] = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (N - 1) + i, 1);
    buckets.push({ key: monthKey(d), label: MONTHS_BG[d.getMonth()], y: d.getFullYear(), m: d.getMonth() });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));

  const [invoices, expenses, clients, unpaid] = await Promise.all([
    prisma.document.findMany({
      where: { companyId, type: "invoice", issueDate: { gte: rangeStart } },
      select: { issueDate: true, clientId: true, status: true, client: { select: { name: true } }, lines: { select: { lineTotal: true, vatRate: true, unitPrice: true, quantity: true } } },
    }),
    prisma.expense.findMany({ where: { companyId, date: { gte: rangeStart } }, select: { date: true, amount: true, vatAmount: true } }),
    prisma.client.findMany({ where: { companyId }, select: { createdAt: true } }),
    prisma.document.findMany({
      where: { companyId, type: "invoice", status: { in: ["sent", "overdue", "issued"] }, dueDate: { not: null } },
      select: { dueDate: true, lines: { select: { lineTotal: true } } },
    }),
  ]);

  const revenueSeries = new Array(N).fill(0);
  const expenseSeries = new Array(N).fill(0);
  const invCountSeries = new Array(N).fill(0);
  const vatSeries = new Array(N).fill(0);
  const newClientsSeries = new Array(N).fill(0);
  const clientTotals = new Map<string, number>();
  let grandRevenue = 0;

  for (const d of invoices) {
    const i = idx.get(monthKey(new Date(d.issueDate)));
    const total = d.lines.reduce((s, l) => s + l.lineTotal, 0);
    const vat = d.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
    grandRevenue += total;
    if (d.client?.name) clientTotals.set(d.client.name, (clientTotals.get(d.client.name) ?? 0) + total);
    if (i != null) { revenueSeries[i] += total; invCountSeries[i] += 1; vatSeries[i] += vat; }
  }
  for (const e of expenses) {
    const i = idx.get(monthKey(new Date(e.date)));
    if (i != null) expenseSeries[i] += e.amount;
  }
  for (const c of clients) {
    const i = idx.get(monthKey(new Date(c.createdAt)));
    if (i != null) newClientsSeries[i] += 1;
  }
  const profitSeries = revenueSeries.map((r, i) => r - expenseSeries[i]);
  const avgInvSeries = revenueSeries.map((r, i) => (invCountSeries[i] ? r / invCountSeries[i] : 0));

  const cur = N - 1, prev = N - 2;
  const hasData = invoices.length > 0 || expenses.length > 0;

  // ─── KPI карти с тренд ───
  const cards: MetricCard[] = [
    mk("revenue", "bi.kpi.revenue", revenueSeries, true, true, cur, prev),
    mk("expenses", "bi.kpi.expenses", expenseSeries, true, false, cur, prev),
    mk("profit", "bi.kpi.profit", profitSeries, true, true, cur, prev),
    mk("invoices", "bi.kpi.invoices", invCountSeries, false, true, cur, prev),
    mk("avg", "bi.kpi.avgInvoice", avgInvSeries, true, true, cur, prev),
    mk("clients", "bi.kpi.newClients", newClientsSeries, false, true, cur, prev),
  ];

  // ─── Просрочени плащания ───
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  let overdueCount = 0, unpaidTotal = 0;
  for (const d of unpaid) {
    const total = d.lines.reduce((s, l) => s + l.lineTotal, 0);
    unpaidTotal += total;
    if (d.dueDate && new Date(d.dueDate) < todayMid) overdueCount++;
  }

  // ─── Топ клиент концентрация ───
  let topClient: { name: string; sharePct: number } | null = null;
  if (clientTotals.size && grandRevenue > 0) {
    const [name, val] = [...clientTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    topClient = { name, sharePct: Math.round((val / grandRevenue) * 100) };
  }

  // ─── Прогноза (run-rate за текущия месец) ───
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const progress = dayOfMonth / daysInMonth;
  const project = (v: number) => (progress > 0 ? v / progress : v);
  const forecast = {
    revenue: project(revenueSeries[cur]),
    expenses: project(expenseSeries[cur]),
    profit: project(profitSeries[cur]),
    vat: project(vatSeries[cur]),
    documents: Math.round(project(invCountSeries[cur])),
    progressPct: Math.round(progress * 100),
  };

  // ─── Business Health ───
  const rev = revenueSeries[cur], exp = expenseSeries[cur], prof = profitSeries[cur];
  const margin = rev > 0 ? (prof / rev) * 100 : 0;
  let score = 100;
  if (rev === 0) score -= 25;
  if (prof < 0) score -= 30; else if (margin < 10) score -= 10;
  if (overdueCount > 0) score -= Math.min(25, overdueCount * 5);
  if (revenueSeries[prev] > 0 && rev < revenueSeries[prev]) score -= 12;
  if (topClient && topClient.sharePct > 40) score -= 8;
  // тренд на печалбата — 3 поредни месеца спад
  if (N >= 3 && profitSeries[cur] < profitSeries[cur - 1] && profitSeries[cur - 1] < profitSeries[cur - 2]) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const healthTone: Severity = score >= 85 ? "good" : score >= 65 ? "ok" : score >= 45 ? "attention" : "critical";
  const healthLabelKey = score >= 85 ? "bi.health.verdictExcellent" : score >= 65 ? "bi.health.verdictGood" : score >= 45 ? "bi.health.verdictAttention" : "bi.health.verdictCritical";
  const healthLabel = score >= 85 ? "Фирмата е в отлично финансово състояние."
    : score >= 65 ? "Стабилно състояние с потенциал за подобрение."
    : score >= 45 ? "Има сигнали, които изискват внимание."
    : "Критични показатели — нужни са спешни действия.";

  // ─── Smart insights ───
  const insights: Insight[] = [];
  const risks: Insight[] = [];
  const opportunities: Insight[] = [];

  const REF = "bi.ref.lastMonth";
  const revDelta = pctChange(rev, revenueSeries[prev]);
  if (revDelta != null && Math.abs(revDelta) >= 3) {
    insights.push({ icon: revDelta >= 0 ? "trending-up" : "trending-down", severity: revDelta >= 0 ? "good" : "attention",
      key: revDelta >= 0 ? "bi.insight.revenueUp" : "bi.insight.revenueDown", vars: { pct: Math.abs(Math.round(revDelta)) }, refKey: REF });
  }
  const expDelta = pctChange(exp, expenseSeries[prev]);
  if (expDelta != null && expDelta >= 15) {
    insights.push({ icon: "trending-up", severity: "attention", key: "bi.insight.expensesUp", vars: { pct: Math.round(expDelta) }, refKey: REF });
    risks.push({ icon: "alert", severity: "attention", key: "bi.insight.expensesUp", vars: { pct: Math.round(expDelta) }, refKey: REF });
  }
  if (N >= 3 && profitSeries[cur] < profitSeries[cur - 1] && profitSeries[cur - 1] < profitSeries[cur - 2]) {
    insights.push({ icon: "trending-down", severity: "critical", key: "bi.insight.profitDecline3" });
    risks.push({ icon: "alert", severity: "critical", key: "bi.insight.profitDecline3" });
  }
  if (topClient && topClient.sharePct >= 30) {
    insights.push({ icon: "user", severity: topClient.sharePct >= 45 ? "attention" : "ok", key: "bi.insight.topClient", vars: { name: topClient.name, pct: topClient.sharePct } });
    if (topClient.sharePct >= 45) risks.push({ icon: "alert", severity: "attention", key: "bi.insight.topClientRisk" });
  }
  if (overdueCount > 0) {
    insights.push({ icon: "clock", severity: overdueCount >= 5 ? "critical" : "attention", key: "bi.insight.overdue", vars: { count: overdueCount } });
    risks.push({ icon: "alert", severity: overdueCount >= 5 ? "critical" : "attention", key: "bi.insight.overdue", vars: { count: overdueCount } });
  }
  const avgDelta = pctChange(avgInvSeries[cur], avgInvSeries[prev]);
  if (avgDelta != null && avgDelta >= 5) insights.push({ icon: "trending-up", severity: "good", key: "bi.insight.avgInvoiceUp", vars: { pct: Math.round(avgDelta) } });
  const clientsDelta = newClientsSeries[cur] - newClientsSeries[prev];
  if (clientsDelta < 0) insights.push({ icon: "trending-down", severity: "attention", key: "bi.insight.newClientsDown" });
  if (forecast.revenue > 0 && rev < revenueSeries[prev]) {
    insights.push({ icon: "forecast", severity: "attention", key: "bi.insight.forecastRevenue", amount: forecast.revenue });
  }
  if (prof < 0) risks.push({ icon: "alert", severity: "critical", key: "bi.insight.expOverRev" });
  if (invCountSeries[cur] === 0 && dayOfMonth > 7) risks.push({ icon: "alert", severity: "attention", key: "bi.insight.noInvoicesMonth" });

  // Възможности
  if (rev > 0) opportunities.push({ icon: "bulb", severity: "good", key: "bi.opp.avgInvoice10Year", amount: avgInvSeries[cur] * invCountSeries[cur] * 12 * 0.1 });
  const bestIdx = revenueSeries.indexOf(Math.max(...revenueSeries));
  if (revenueSeries[bestIdx] > 0) opportunities.push({ icon: "bulb", severity: "ok", key: "bi.opp.bestMonth", vars: { label: buckets[bestIdx].label } });
  if (topClient) opportunities.push({ icon: "bulb", severity: "ok", key: "bi.opp.diversify" });

  if (insights.length === 0) insights.push({ icon: "check", severity: "good", key: "bi.insight.stable" });
  if (risks.length === 0) risks.push({ icon: "check", severity: "good", key: "bi.insight.noRisks" });

  return {
    hasData,
    monthsLabels: buckets.map((b) => b.label),
    revenueSeries, expenseSeries, profitSeries,
    cards,
    health: { score, label: healthLabel, labelKey: healthLabelKey, tone: healthTone },
    insights, risks, opportunities,
    forecast,
    topClient,
  };

  function mk(key: string, labelKey: string, series: number[], money: boolean, goodWhenUp: boolean, ci: number, pi: number): MetricCard {
    const c = series[ci], p = series[pi];
    const dp = pctChange(c, p);
    const d = dir(c, p);
    let captionKey = "bi.caption.noBase";
    if (dp != null) {
      if (d === "flat") captionKey = "bi.caption.flat";
      else captionKey = (goodWhenUp ? d === "up" : d === "down") ? "bi.caption.better" : "bi.caption.worse";
    }
    return { key, labelKey, value: c, money, deltaPct: dp, direction: d, goodWhenUp, captionKey, captionRefKey: "bi.ref.lastMonth", spark: series.slice() };
  }
}
