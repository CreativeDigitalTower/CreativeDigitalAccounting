import { prisma } from "@/lib/prisma";
import type { Insight, MetricCard, Severity } from "@/lib/bi/overview";

// ─────────────────────────────────────────────────────────────────────────
// Analytics engine — период-базирани справки с actionable изводи.
// Всичко се смята от реалните данни на активната фирма (scoped по companyId).
// Приходи = фактури (lineTotal); Разходи = таблица „Разходи".
// ─────────────────────────────────────────────────────────────────────────

export type PeriodId = "this_month" | "last_month" | "quarter" | "year" | "last_year" | "custom";

export type ResolvedPeriod = {
  id: PeriodId; label: string;
  start: Date; end: Date;
  prevStart: Date; prevEnd: Date; prevLabel: string;
};

const MONTHS_BG = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
const bg = (n: number) => Math.round(n).toLocaleString("bg-BG");

export function resolvePeriod(sp: { period?: string; from?: string; to?: string }): ResolvedPeriod {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const endOfToday = new Date(y, m, now.getDate(), 23, 59, 59, 999);
  let id = (sp.period as PeriodId) ?? "this_month";
  let start: Date, end: Date, label: string;

  if (sp.from && sp.to) {
    id = "custom";
    start = new Date(sp.from); start.setHours(0, 0, 0, 0);
    end = new Date(sp.to); end.setHours(23, 59, 59, 999);
    label = `${start.toLocaleDateString("bg-BG")} – ${end.toLocaleDateString("bg-BG")}`;
  } else if (id === "last_month") {
    start = new Date(y, m - 1, 1); end = new Date(y, m, 0, 23, 59, 59, 999); label = "Предишен месец";
  } else if (id === "quarter") {
    const q = Math.floor(m / 3); start = new Date(y, q * 3, 1); end = endOfToday; label = `Тримесечие Q${q + 1}`;
  } else if (id === "year") {
    start = new Date(y, 0, 1); end = endOfToday; label = "Тази година (до днес)";
  } else if (id === "last_year") {
    start = new Date(y - 1, 0, 1); end = new Date(y - 1, 11, 31, 23, 59, 59, 999); label = "Миналата година";
  } else {
    id = "this_month"; start = new Date(y, m, 1); end = endOfToday; label = "Текущ месец";
  }

  // Съпоставим предходен период — непосредствено предхождащ прозорец с еднаква дължина.
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { id, label, start, end, prevStart, prevEnd, prevLabel: "предходния сравним период" };
}

type Bucket = { label: string; start: number; end: number };
function buildBuckets(start: Date, end: Date): Bucket[] {
  const days = (end.getTime() - start.getTime()) / 86400000;
  const buckets: Bucket[] = [];
  if (days <= 45) {
    // дневни
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (d <= end) {
      const s = new Date(d); const e = new Date(d); e.setHours(23, 59, 59, 999);
      buckets.push({ label: `${d.getDate()}.${d.getMonth() + 1}`, start: s.getTime(), end: e.getTime() });
      d.setDate(d.getDate() + 1);
    }
  } else {
    // месечни
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      const s = new Date(d.getFullYear(), d.getMonth(), 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({ label: MONTHS_BG[d.getMonth()], start: s.getTime(), end: e.getTime() });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return buckets;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
function dir(cur: number, prev: number): "up" | "down" | "flat" { return cur > prev ? "up" : cur < prev ? "down" : "flat"; }

export type AnalyticsData = {
  period: { label: string };
  hasData: boolean;
  enoughToCompare: boolean;
  cards: MetricCard[];
  trend: { labels: string[]; revenue: number[]; expenses: number[]; profit: number[] };
  health: { score: number; label: string; tone: Severity; notes: string[] };
  insights: Insight[]; risks: Insight[]; opportunities: Insight[];
  forecast: { revenue: number; expenses: number; profit: number; vat: number; documents: number; progressPct: number } | null;
  topClients: { name: string; total: number; sharePct: number }[];
  payments: { paidCount: number; paidAmount: number; unpaidCount: number; unpaidAmount: number; overdueCount: number; overdueAmount: number };
};

export async function computeAnalytics(companyId: string, period: ResolvedPeriod): Promise<AnalyticsData> {
  const now = new Date();
  const invSelect = { issueDate: true, clientId: true, status: true, dueDate: true, paidAmount: true, client: { select: { name: true } }, lines: { select: { lineTotal: true, quantity: true, unitPrice: true, vatRate: true } } } as const;

  const [invCur, invPrev, expCur, expPrev, newClientsCur, newClientsPrev, outstanding] = await Promise.all([
    prisma.document.findMany({ where: { companyId, type: "invoice", issueDate: { gte: period.start, lte: period.end } }, select: invSelect }),
    prisma.document.findMany({ where: { companyId, type: "invoice", issueDate: { gte: period.prevStart, lte: period.prevEnd } }, select: invSelect }),
    prisma.expense.aggregate({ where: { companyId, date: { gte: period.start, lte: period.end } }, _sum: { amount: true, vatAmount: true }, _count: true }),
    prisma.expense.aggregate({ where: { companyId, date: { gte: period.prevStart, lte: period.prevEnd } }, _sum: { amount: true } }),
    prisma.client.count({ where: { companyId, createdAt: { gte: period.start, lte: period.end } } }),
    prisma.client.count({ where: { companyId, createdAt: { gte: period.prevStart, lte: period.prevEnd } } }),
    prisma.document.findMany({ where: { companyId, type: "invoice", status: { in: ["sent", "overdue", "issued"] }, dueDate: { not: null } }, select: { dueDate: true, paidAmount: true, lines: { select: { lineTotal: true } } } }),
  ]);

  const sumInv = (arr: typeof invCur) => arr.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const revCur = sumInv(invCur), revPrev = sumInv(invPrev);
  const expCurV = expCur._sum.amount ?? 0, expPrevV = expPrev._sum.amount ?? 0;
  const profitCur = revCur - expCurV, profitPrev = revPrev - expPrevV;
  const avgCur = invCur.length ? revCur / invCur.length : 0;
  const avgPrev = invPrev.length ? revPrev / invPrev.length : 0;
  const marginCur = revCur > 0 ? (profitCur / revCur) * 100 : 0;
  const marginPrev = revPrev > 0 ? (profitPrev / revPrev) * 100 : 0;

  // Паричен поток за периода: платени фактури − разходи
  const paidRevCur = invCur.filter((d) => d.status === "paid").reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const paidRevPrev = invPrev.filter((d) => d.status === "paid").reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
  const cashCur = paidRevCur - expCurV, cashPrev = paidRevPrev - expPrevV;

  const hasData = invCur.length > 0 || (expCur._count ?? 0) > 0;
  const enoughToCompare = invPrev.length > 0 || expPrevV > 0;

  // ─── Trend серии ───
  const buckets = buildBuckets(period.start, period.end);
  const revenue = new Array(buckets.length).fill(0);
  const expensesArr = new Array(buckets.length).fill(0);
  const bucketOf = (t: number) => { for (let i = 0; i < buckets.length; i++) if (t >= buckets[i].start && t <= buckets[i].end) return i; return -1; };
  for (const d of invCur) { const i = bucketOf(new Date(d.issueDate).getTime()); if (i >= 0) revenue[i] += d.lines.reduce((s, l) => s + l.lineTotal, 0); }
  // разходи по кофи — нужен е отделен fetch за дати
  const expRows = await prisma.expense.findMany({ where: { companyId, date: { gte: period.start, lte: period.end } }, select: { date: true, amount: true } });
  for (const e of expRows) { const i = bucketOf(new Date(e.date).getTime()); if (i >= 0) expensesArr[i] += e.amount; }
  const profitArr = revenue.map((r, i) => r - expensesArr[i]);

  // ─── KPI карти ───
  const mk = (key: string, label: string, cur: number, prev: number, money: boolean, goodWhenUp: boolean, spark: number[]): MetricCard => {
    const dp = pctChange(cur, prev); const d = dir(cur, prev);
    let caption = "спрямо предходния период";
    if (!enoughToCompare || dp == null) caption = "няма съпоставим период";
    else if (d === "flat") caption = "без промяна спрямо предходния период";
    else caption = (goodWhenUp ? d === "up" : d === "down") ? "по-добре от предходния период" : "по-слабо от предходния период";
    return { key, label, value: cur, money, deltaPct: enoughToCompare ? dp : null, direction: d, goodWhenUp, caption, spark };
  };
  const cards: MetricCard[] = [
    mk("revenue", "Приходи", revCur, revPrev, true, true, revenue),
    mk("expenses", "Разходи", expCurV, expPrevV, true, false, expensesArr),
    mk("profit", "Печалба", profitCur, profitPrev, true, true, profitArr),
    mk("margin", "Марж на печалба", Math.round(marginCur), Math.round(marginPrev), false, true, buckets.map((_, i) => (revenue[i] > 0 ? Math.round((profitArr[i] / revenue[i]) * 100) : 0))),
    mk("cash", "Паричен поток", cashCur, cashPrev, true, true, buckets.map((_, i) => revenue[i] - expensesArr[i])),
    mk("invoices", "Издадени фактури", invCur.length, invPrev.length, false, true, revenue.map((v) => (v > 0 ? 1 : 0))),
    mk("avg", "Средна фактура", avgCur, avgPrev, true, true, buckets.map((_, i) => revenue[i])),
    mk("clients", "Нови клиенти", newClientsCur, newClientsPrev, false, true, buckets.map(() => 0)),
  ];

  // ─── Просрочени / неплатени ───
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  let paidCount = 0, paidAmount = 0, unpaidCount = 0, unpaidAmount = 0, overdueCount = 0, overdueAmount = 0;
  for (const d of invCur) { if (d.status === "paid") { paidCount++; paidAmount += d.lines.reduce((s, l) => s + l.lineTotal, 0); } }
  for (const d of outstanding) {
    const total = d.lines.reduce((s, l) => s + l.lineTotal, 0);
    unpaidCount++; unpaidAmount += total;
    if (d.dueDate && new Date(d.dueDate) < todayMid) { overdueCount++; overdueAmount += total; }
  }

  // ─── Топ клиенти + концентрация ───
  const clientTotals = new Map<string, number>();
  for (const d of invCur) if (d.client?.name) clientTotals.set(d.client.name, (clientTotals.get(d.client.name) ?? 0) + d.lines.reduce((s, l) => s + l.lineTotal, 0));
  const topClients = [...clientTotals.entries()].map(([name, total]) => ({ name, total, sharePct: revCur > 0 ? Math.round((total / revCur) * 100) : 0 })).sort((a, b) => b.total - a.total).slice(0, 8);
  const topShare = topClients[0]?.sharePct ?? 0;

  // ─── Прогноза (само за периоди, обхващащи текущия момент) ───
  let forecast: AnalyticsData["forecast"] = null;
  if (period.start <= now && period.end >= now) {
    const elapsed = now.getTime() - period.start.getTime();
    const totalLen = period.end.getTime() - period.start.getTime();
    const progress = totalLen > 0 ? Math.min(1, elapsed / totalLen) : 1;
    if (progress > 0.02) {
      const p = (v: number) => v / progress;
      const vatCur = invCur.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.quantity * l.unitPrice * (l.vatRate / 100), 0), 0);
      forecast = { revenue: p(revCur), expenses: p(expCurV), profit: p(profitCur), vat: p(vatCur), documents: Math.round(p(invCur.length)), progressPct: Math.round(progress * 100) };
    }
  }

  // ─── Business Health ───
  let score = 100; const notes: string[] = [];
  if (revCur === 0) { score -= 25; notes.push("Няма приходи за периода."); }
  if (profitCur < 0) { score -= 30; notes.push("Разходите надвишават приходите."); } else if (marginCur < 10) { score -= 10; notes.push("Нисък марж (под 10%)."); }
  if (overdueCount > 0) { score -= Math.min(25, overdueCount * 5); notes.push(`${overdueCount} просрочени фактури.`); }
  if (enoughToCompare && revPrev > 0 && revCur < revPrev) { score -= 12; notes.push("Спад в приходите спрямо предходния период."); }
  if (topShare > 40) { score -= 8; notes.push("Висока концентрация в един клиент."); }
  if (notes.length === 0) notes.push("Няма отклонения, изискващи внимание.");
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tone: Severity = score >= 85 ? "good" : score >= 65 ? "ok" : score >= 45 ? "attention" : "critical";
  const healthLabel = score >= 85 ? "Отлично финансово състояние." : score >= 65 ? "Стабилно с потенциал за подобрение." : score >= 45 ? "Има сигнали за внимание." : "Критични показатели.";

  // ─── Actionable insights / risks / opportunities ───
  const insights: Insight[] = [], risks: Insight[] = [], opportunities: Insight[] = [];
  const revDelta = pctChange(revCur, revPrev);
  if (enoughToCompare && revDelta != null && Math.abs(revDelta) >= 3) {
    insights.push({ icon: revDelta >= 0 ? "trending-up" : "trending-down", severity: revDelta >= 0 ? "good" : "attention",
      text: `Приходите са с ${Math.abs(Math.round(revDelta))}% ${revDelta >= 0 ? "по-високи" : "по-ниски"} спрямо предходния период.`, href: "/dashboard/invoices", cta: "Прегледай фактурите" });
  }
  const expDelta = pctChange(expCurV, expPrevV);
  if (enoughToCompare && expDelta != null && expDelta >= 15) {
    insights.push({ icon: "trending-up", severity: "attention", text: `Разходите нарастват с ${Math.round(expDelta)}% спрямо предходния период.`, href: "/dashboard/expenses", cta: "Виж разходите" });
  }
  if (enoughToCompare && revDelta != null && expDelta != null && expDelta > revDelta + 5) {
    risks.push({ icon: "alert", severity: "attention", text: "Разходите растат по-бързо от приходите.", href: "/dashboard/expenses", cta: "Анализирай разходите" });
  }
  if (overdueCount > 0) {
    const msg = `${overdueCount} просрочени фактури блокират ${bg(overdueAmount)} €.`;
    insights.push({ icon: "clock", severity: overdueCount >= 5 ? "critical" : "attention", text: msg, href: "/dashboard/invoices?status=overdue", cta: "Събери плащания" });
    risks.push({ icon: "alert", severity: overdueCount >= 5 ? "critical" : "attention", text: msg, href: "/dashboard/invoices?status=overdue", cta: "Виж просрочените" });
  }
  if (topShare >= 30 && topClients[0]) {
    insights.push({ icon: "user", severity: topShare >= 45 ? "attention" : "ok", text: `Клиент „${topClients[0].name}" формира ${topShare}% от оборота за периода.`, href: "/dashboard/clients", cta: "Виж клиентите" });
    if (topShare >= 45) risks.push({ icon: "alert", severity: "attention", text: `Висок риск от концентрация — един клиент е ${topShare}% от оборота.`, href: "/dashboard/clients", cta: "Диверсифицирай" });
  }
  if (profitCur < 0) risks.push({ icon: "alert", severity: "critical", text: "Разходите надвишават приходите за периода.", href: "/dashboard/expenses", cta: "Прегледай разходите" });
  const avgDelta = pctChange(avgCur, avgPrev);
  if (enoughToCompare && avgDelta != null && avgDelta >= 5) insights.push({ icon: "trending-up", severity: "good", text: `Средната стойност на фактура се увеличава (+${Math.round(avgDelta)}%).` });
  if (enoughToCompare && newClientsCur < newClientsPrev) insights.push({ icon: "trending-down", severity: "attention", text: "Намалява броят на новите клиенти.", href: "/dashboard/clients", cta: "Привлечи клиенти" });
  if (forecast && enoughToCompare && revCur < revPrev) insights.push({ icon: "forecast", severity: "attention", text: `При текущия темп периодът приключва с около ${bg(forecast.revenue)} € приходи.` });

  if (revCur > 0) opportunities.push({ icon: "bulb", severity: "good", text: `Ако вдигнете средната фактура с 10%, приходите за периода биха били ~${bg(revCur * 0.1)} € повече.` });
  const bestIdx = revenue.indexOf(Math.max(...revenue));
  if (revenue[bestIdx] > 0 && buckets[bestIdx]) opportunities.push({ icon: "bulb", severity: "ok", text: `Най-силен интервал в периода: ${buckets[bestIdx].label}.` });
  if (unpaidAmount > 0) opportunities.push({ icon: "bulb", severity: "ok", text: `${bg(unpaidAmount)} € чакат събиране — по-бързото инкасиране подобрява паричния поток.`, href: "/dashboard/invoices?status=overdue", cta: "Събери" });

  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: enoughToCompare ? "Показателите са стабилни. Няма отклонения." : "Все още няма достатъчно информация за надеждно сравнение." });
  if (risks.length === 0) risks.push({ icon: "check", severity: "good", text: "Няма установени рискове за момента." });
  if (opportunities.length === 0) opportunities.push({ icon: "bulb", severity: "ok", text: "Продължавайте да въвеждате данни за по-точни препоръки." });

  return {
    period: { label: period.label },
    hasData, enoughToCompare, cards,
    trend: { labels: buckets.map((b) => b.label), revenue, expenses: expensesArr, profit: profitArr },
    health: { score, label: healthLabel, tone, notes },
    insights, risks, opportunities, forecast, topClients,
    payments: { paidCount, paidAmount, unpaidCount, unpaidAmount, overdueCount, overdueAmount },
  };
}
