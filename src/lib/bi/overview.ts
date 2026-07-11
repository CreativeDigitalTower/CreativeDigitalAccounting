import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────
// Actionable Business Intelligence — превръща суровите данни в изводи.
// Всичко се смята от реалните данни на фирмата (фактури, разходи, клиенти).
// ─────────────────────────────────────────────────────────────────────────

export type Severity = "good" | "ok" | "attention" | "critical";
export type Insight = { icon: string; text: string; severity: Severity; href?: string; cta?: string };
export type MetricCard = {
  key: string;
  label: string;
  value: number;
  money: boolean;
  deltaPct: number | null;   // спрямо предходния месец
  direction: "up" | "down" | "flat";
  goodWhenUp: boolean;       // за оцветяване (приходи ↑ добре, разходи ↑ зле)
  caption: string;           // кратко обяснение/сравнение
  spark: number[];           // микрографика (последни месеци)
};

export type BusinessOverview = {
  hasData: boolean;
  monthsLabels: string[];
  revenueSeries: number[];
  expenseSeries: number[];
  profitSeries: number[];
  cards: MetricCard[];
  health: { score: number; label: string; tone: Severity };
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
    mk("revenue", "Приходи", revenueSeries, true, true, cur, prev),
    mk("expenses", "Разходи", expenseSeries, true, false, cur, prev),
    mk("profit", "Печалба", profitSeries, true, true, cur, prev),
    mk("invoices", "Издадени фактури", invCountSeries, false, true, cur, prev),
    mk("avg", "Средна фактура", avgInvSeries, true, true, cur, prev),
    mk("clients", "Нови клиенти", newClientsSeries, false, true, cur, prev),
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
  const healthLabel = score >= 85 ? "Фирмата е в отлично финансово състояние."
    : score >= 65 ? "Стабилно състояние с потенциал за подобрение."
    : score >= 45 ? "Има сигнали, които изискват внимание."
    : "Критични показатели — нужни са спешни действия.";

  // ─── Smart insights ───
  const insights: Insight[] = [];
  const risks: Insight[] = [];
  const opportunities: Insight[] = [];

  const revDelta = pctChange(rev, revenueSeries[prev]);
  if (revDelta != null && Math.abs(revDelta) >= 3) {
    insights.push({ icon: revDelta >= 0 ? "trending-up" : "trending-down", severity: revDelta >= 0 ? "good" : "attention",
      text: `Приходите ${revDelta >= 0 ? "нараснаха" : "намаляха"} с ${Math.abs(Math.round(revDelta))}% спрямо предходния месец.` });
  }
  const expDelta = pctChange(exp, expenseSeries[prev]);
  if (expDelta != null && expDelta >= 15) {
    insights.push({ icon: "trending-up", severity: "attention", text: `Разходите се увеличиха с ${Math.round(expDelta)}% спрямо предходния месец.` });
    risks.push({ icon: "alert", severity: "attention", text: `Необичайно висок ръст на разходите (+${Math.round(expDelta)}%).` });
  }
  // 3 месеца спад в печалбата
  if (N >= 3 && profitSeries[cur] < profitSeries[cur - 1] && profitSeries[cur - 1] < profitSeries[cur - 2]) {
    insights.push({ icon: "trending-down", severity: "critical", text: "Печалбата намалява вече трети пореден месец." });
    risks.push({ icon: "alert", severity: "critical", text: "Устойчив низходящ тренд на печалбата." });
  }
  if (topClient && topClient.sharePct >= 30) {
    insights.push({ icon: "user", severity: topClient.sharePct >= 45 ? "attention" : "ok",
      text: `Най-големият клиент „${topClient.name}" формира ${topClient.sharePct}% от приходите.` });
    if (topClient.sharePct >= 45) risks.push({ icon: "alert", severity: "attention", text: "Прекалено голяма зависимост от един клиент." });
  }
  if (overdueCount > 0) {
    insights.push({ icon: "clock", severity: overdueCount >= 5 ? "critical" : "attention",
      text: `${overdueCount} фактури са просрочени на обща стойност, изискват събиране.` });
    risks.push({ icon: "alert", severity: overdueCount >= 5 ? "critical" : "attention", text: `${overdueCount} неплатени/просрочени фактури.` });
  }
  const avgDelta = pctChange(avgInvSeries[cur], avgInvSeries[prev]);
  if (avgDelta != null && avgDelta >= 5) insights.push({ icon: "trending-up", severity: "good", text: `Средната стойност на фактура се увеличава (+${Math.round(avgDelta)}%).` });
  const clientsDelta = newClientsSeries[cur] - newClientsSeries[prev];
  if (clientsDelta < 0) insights.push({ icon: "trending-down", severity: "attention", text: "Намалява броят на новите клиенти спрямо предходния месец." });
  if (forecast.revenue > 0 && rev < revenueSeries[prev]) {
    insights.push({ icon: "forecast", severity: "attention", text: `При текущия темп месецът приключва с около ${Math.round(forecast.revenue)} € приходи.` });
  }
  if (prof < 0) risks.push({ icon: "alert", severity: "critical", text: "Разходите надвишават приходите този месец." });
  if (invCountSeries[cur] === 0 && dayOfMonth > 7) risks.push({ icon: "alert", severity: "attention", text: "Няма издадени фактури този месец." });

  // Възможности
  if (rev > 0) opportunities.push({ icon: "bulb", severity: "good",
    text: `Ако увеличите средната фактура с 10%, годишният приход би нараснал с ~${Math.round(avgInvSeries[cur] * invCountSeries[cur] * 12 * 0.1)} €.` });
  // най-силен месец в периода
  const bestIdx = revenueSeries.indexOf(Math.max(...revenueSeries));
  if (revenueSeries[bestIdx] > 0) opportunities.push({ icon: "bulb", severity: "ok", text: `Най-силен месец в периода е ${buckets[bestIdx].label} — анализирайте какво го отличава.` });
  if (topClient) opportunities.push({ icon: "bulb", severity: "ok", text: "Разширяването на клиентската база ще намали зависимостта и риска." });

  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: "Показателите са стабилни. Няма отклонения, изискващи внимание." });
  if (risks.length === 0) risks.push({ icon: "check", severity: "good", text: "Няма установени рискове за момента." });

  return {
    hasData,
    monthsLabels: buckets.map((b) => b.label),
    revenueSeries, expenseSeries, profitSeries,
    cards,
    health: { score, label: healthLabel, tone: healthTone },
    insights, risks, opportunities,
    forecast,
    topClient,
  };

  function mk(key: string, label: string, series: number[], money: boolean, goodWhenUp: boolean, ci: number, pi: number): MetricCard {
    const c = series[ci], p = series[pi];
    const dp = pctChange(c, p);
    const d = dir(c, p);
    let caption = "спрямо миналия месец";
    if (dp == null) caption = "няма база за сравнение";
    else if (d === "flat") caption = "без промяна спрямо миналия месец";
    else {
      const better = goodWhenUp ? d === "up" : d === "down";
      caption = better ? "по-добре от миналия месец" : "по-слабо от миналия месец";
    }
    return { key, label, value: c, money, deltaPct: dp, direction: d, goodWhenUp, caption, spark: series.slice() };
  }
}
