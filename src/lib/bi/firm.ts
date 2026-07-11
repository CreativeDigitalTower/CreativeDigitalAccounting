import type { Insight, MetricCard, Severity } from "@/lib/bi/overview";
import type { PartnerStats } from "@/lib/partner";

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

const money = (v: number) => Math.round(v).toLocaleString("bg-BG") + " €";

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
export function clientSummary(c: EnrichedClient): string[] {
  const out: string[] = [];
  if (c.revThisMonth > c.revLastMonth && c.revLastMonth > 0) out.push("Приходите растат.");
  else if (c.revThisMonth < c.revLastMonth) out.push("Приходите намаляват.");
  if (c.profit < 0) out.push("Разходите надвишават приходите."); else if (c.revenue > 0 && c.profit / c.revenue < 0.1) out.push("Нисък марж на печалба.");
  if (c.overdue > 0) out.push(`${c.overdue} просрочени фактури.`);
  else if (c.unpaid > 0) out.push("Има неплатени фактури."); else out.push("Няма просрочени задължения.");
  if (c.lastActivityDays != null && c.lastActivityDays > 30) out.push(`Без активност от ${c.lastActivityDays} дни.`);
  if (c.vatState === "over") out.push("Надхвърли прага за ДДС регистрация.");
  else if (c.vatState === "near") out.push("Наближава прага за ДДС.");
  const sug = upgradeSuggestion(c);
  if (sug) out.push(`Добър кандидат за ${sug}.`);
  return out;
}

/** Предложение за по-висок план, изчислено само от оборота/активността. */
export function upgradeSuggestion(c: EnrichedClient): string | null {
  if (c.status === "paid") return null;
  if (c.revenue >= 60000 || c.vatState === "over") return "Про";
  if (c.revenue >= 20000 || c.invoices >= 60) return "Бизнес";
  return null;
}

export function buildFirmOverview(input: { clients: EnrichedClient[]; monthToDate: { revenue: number; expenses: number; vat: number; progressPct: number }; partner: PartnerStats; pendingPayoutCount: number }): FirmOverview {
  const { clients, monthToDate, partner, pendingPayoutCount } = input;
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

  const flat = (key: string, label: string, value: number, m: boolean, caption = "текуща стойност"): MetricCard =>
    ({ key, label, value, money: m, deltaPct: null, direction: "flat", goodWhenUp: true, caption, spark: [] });
  const cards: MetricCard[] = [
    flat("total", "Клиентски фирми", total, false),
    flat("active", "Активни (30 дни)", active, false),
    flat("new", "Нови този месец", newThisMonth, false),
    flat("start", "Клиенти на СТАРТ", startClients, false),
    flat("paid", "Клиенти на платен план", paid, false),
    flat("conv", "Конверсия към платен", conversion, false, `${paid} от ${total} фирми`),
    flat("revenue", "Общ оборот (година)", revenue, true),
    flat("expenses", "Общи разходи (година)", expenses, true),
    flat("profit", "Обща печалба", profit, true),
    flat("vat", "Очакван ДДС (месец)", forecast?.vat ?? 0, true),
    flat("docs", "Общо документи", docs, false),
    flat("unpaid", "Клиенти с неплатени", unpaidCount, false),
    flat("overdue", "Просрочени фактури", overdueCount, false),
    flat("commission", "Очаквана комисионна/мес", partner.monthlyCommission, true),
    flat("paidcomm", "Изплатени комисионни", partner.paidTotal, true),
    flat("pending", "Чакащи заявки", pendingPayoutCount, false),
  ];

  const healthDist = { good: 0, ok: 0, attention: 0, critical: 0 };
  for (const c of clients) healthDist[c.healthTone]++;

  // ─── Insights (портфейл) ───
  const insights: Insight[] = [];
  const growing = clients.filter((c) => c.revLastMonth > 0 && c.revThisMonth > c.revLastMonth).length;
  const declining = clients.filter((c) => c.revThisMonth < c.revLastMonth).length;
  if (growing > 0 || declining > 0) insights.push({ icon: growing >= declining ? "trending-up" : "trending-down", severity: growing >= declining ? "good" : "attention", text: `${growing} клиенти увеличават приходите, ${declining} са в спад този месец.` });
  const critical = clients.filter((c) => c.healthTone === "critical").length;
  if (critical > 0) insights.push({ icon: "alert", severity: "critical", text: `${critical} клиентски фирми са в критично състояние и изискват внимание.` });
  if (overdueCount > 0) insights.push({ icon: "clock", severity: "attention", text: `Общо ${overdueCount} просрочени фактури при клиентите.` });
  if (partner.monthlyCommission > 0) insights.push({ icon: "trending-up", severity: "good", text: `Очаквана месечна партньорска комисионна: ${money(partner.monthlyCommission)}.` });
  if (insights.length === 0) insights.push({ icon: "check", severity: "good", text: "Няма отклонения при клиентите. Всичко е под контрол." });

  // ─── Възможности (надграждания) ───
  const opportunities: Insight[] = [];
  for (const c of clients) { const s = upgradeSuggestion(c); if (s) opportunities.push({ icon: "bulb", severity: "good", text: `„${c.name}" е подходящ за ${s} (оборот ${money(c.revenue)}).` }); }
  if (opportunities.length === 0) opportunities.push({ icon: "bulb", severity: "ok", text: "Все още няма клиенти, готови за надграждане към по-висок план." });
  const trimmedOpp = opportunities.slice(0, 6);

  // ─── Task Center (Изисква внимание) ───
  const tasks: FirmTask[] = [];
  for (const c of clients.filter((x) => x.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 6))
    tasks.push({ severity: c.overdue >= 5 ? "critical" : "attention", icon: "clock", text: `${c.name}: ${c.overdue} просрочени фактури (${money(c.unpaid)}).`, clientId: c.id, cta: "Отиди" });
  for (const c of clients.filter((x) => x.lastActivityDays != null && x.lastActivityDays > 30).sort((a, b) => (b.lastActivityDays ?? 0) - (a.lastActivityDays ?? 0)).slice(0, 5))
    tasks.push({ severity: "attention", icon: "alert", text: `${c.name}: няма издавани документи от ${c.lastActivityDays} дни.`, clientId: c.id, cta: "Отиди" });
  for (const c of clients.filter((x) => x.vatState === "over").slice(0, 4))
    tasks.push({ severity: "attention", icon: "alert", text: `${c.name}: надхвърли прага за ДДС регистрация.`, clientId: c.id, cta: "Отиди" });
  if (pendingPayoutCount > 0) tasks.push({ severity: "ok", icon: "bulb", text: `Имате ${pendingPayoutCount} чакащи заявки за изплащане на комисионна.`, href: "#partner", cta: "Виж" });
  if (tasks.length === 0) tasks.push({ severity: "good", icon: "check", text: "Няма събития, изискващи внимание при клиентите." });

  return { cards, healthDist, forecast, insights, opportunities: trimmedOpp, tasks };
}
