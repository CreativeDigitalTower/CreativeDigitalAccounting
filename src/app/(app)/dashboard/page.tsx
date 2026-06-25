import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { WelcomeWizard } from "@/components/app/WelcomeWizard";
import { formatCurrency, toBGN, isDualCurrencyActive, FREE_PLAN_LIMIT, getYearMonth, planHasFeature, type PlanId } from "@/lib/constants";
import { TopClientsChart, aggregateClientRevenue } from "@/components/app/TopClientsChart";

export default async function DashboardPage() {
  const { companyId, userId } = await requireCompany();

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } });
  let onboarding = null;
  if (!me?.onboardedAt) {
    const [company, clientCount, invoiceCount] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { eik: true, address: true, logoUrl: true } }),
      prisma.client.count({ where: { companyId } }),
      prisma.document.count({ where: { companyId, type: "invoice" } }),
    ]);
    onboarding = {
      hasCompanyData: !!(company?.eik || company?.address),
      hasLogo: !!company?.logoUrl,
      hasClient: clientCount > 0,
      hasInvoice: invoiceCount > 0,
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // KPIs
  const [revenueResult, expenseResult, overdueInvoices, recentDocs, usageCounter, subscription, lowStock, expiringContracts] =
    await Promise.all([
      // Monthly revenue (sum of paid+sent invoices this month)
      prisma.document.findMany({
        where: {
          companyId,
          type: "invoice",
          status: { in: ["paid", "sent"] },
          issueDate: { gte: monthStart },
        },
        include: { lines: true },
      }),
      // Monthly expenses
      prisma.expense.aggregate({
        where: { companyId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Overdue invoices
      prisma.document.count({
        where: { companyId, type: "invoice", status: "overdue" },
      }),
      // Recent documents
      prisma.document.findMany({
        where: { companyId },
        include: { client: true, lines: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      // Usage this month
      prisma.usageCounter.findUnique({
        where: { companyId_yearMonth: { companyId, yearMonth: getYearMonth() } },
      }),
      prisma.subscription.findUnique({ where: { companyId } }),
      // Low stock items
      prisma.stockItem.findMany({
        where: {
          companyId,
          minQuantity: { not: null },
        },
      }),
      // Expiring contracts (next 30 days)
      prisma.contract.findMany({
        where: {
          companyId,
          status: "active",
          endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 3600 * 1000) },
        },
        take: 3,
      }),
    ]);

  const monthRevenue = revenueResult.reduce((sum, doc) => {
    return sum + doc.lines.reduce((s, l) => s + l.lineTotal, 0);
  }, 0);

  const monthExpenses = expenseResult._sum.amount ?? 0;
  const profit = monthRevenue - monthExpenses;

  const docsUsed = usageCounter?.documentsIssuedCount ?? 0;
  const docsLimit = subscription?.plan === "free" ? FREE_PLAN_LIMIT : subscription?.plan === "start" ? 50 : subscription?.plan === "business" ? 200 : Infinity;

  const lowStockItems = lowStock.filter((i) => i.minQuantity !== null && i.quantity <= (i.minQuantity ?? 0));
  const dual = isDualCurrencyActive();

  // Приходи по клиент (за топ 5 диаграмата)
  const clientRevenueInvoices = await prisma.document.findMany({
    where: { companyId, type: "invoice", clientId: { not: null } },
    select: { client: { select: { name: true } }, lines: { select: { lineTotal: true } } },
  });
  const clientRevenue = aggregateClientRevenue(clientRevenueInvoices);

  // Бизнес здравен индекс + напомняния за плащане (Бизнес + Про)
  const hasHealth = planHasFeature((subscription?.plan ?? "free") as PlanId, "health_index");
  let health: { score: number; notes: string[] } | null = null;
  let paymentReminders: { id: string; number: string; client: string; total: number; dueDate: Date; daysOverdue: number }[] = [];
  if (hasHealth) {
    const lastMonthInvoices = await prisma.document.findMany({
      where: { companyId, type: "invoice", status: { in: ["paid", "sent"] }, issueDate: { gte: lastMonthStart, lt: monthStart } },
      include: { lines: true },
    });
    const lastMonthRevenue = lastMonthInvoices.reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);
    const margin = monthRevenue > 0 ? (profit / monthRevenue) * 100 : 0;
    const notes: string[] = [];
    let score = 100;
    if (monthRevenue === 0) { score -= 25; notes.push("Няма приходи за текущия месец."); }
    if (profit < 0) { score -= 30; notes.push("Разходите надвишават приходите."); }
    else if (margin < 10) { score -= 10; notes.push("Нисък марж на печалба (под 10%)."); }
    if (overdueInvoices > 0) { score -= Math.min(25, overdueInvoices * 5); notes.push(`${overdueInvoices} просрочени фактури.`); }
    if (lastMonthRevenue > 0 && monthRevenue < lastMonthRevenue) { score -= 15; notes.push("Спад в приходите спрямо миналия месец."); }
    if (notes.length === 0) notes.push("Бизнесът е в добро финансово състояние.");
    score = Math.max(0, Math.min(100, Math.round(score)));
    health = { score, notes };

    const unpaid = await prisma.document.findMany({
      where: { companyId, type: "invoice", status: { in: ["sent", "overdue", "issued"] }, dueDate: { not: null } },
      include: { client: true, lines: true },
      orderBy: { dueDate: "asc" },
    });
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    paymentReminders = unpaid
      .map((d) => {
        const total = d.lines.reduce((s, l) => s + l.lineTotal, 0);
        const due = d.dueDate as Date;
        const daysOverdue = Math.round((todayMid.getTime() - new Date(due).setHours(0, 0, 0, 0)) / 86400000);
        return { id: d.id, number: d.number, client: d.client?.name ?? "—", total, dueDate: due, daysOverdue };
      })
      .filter((r) => r.daysOverdue >= -3) // падеж до 3 дни напред или вече просрочени
      .slice(0, 8);
  }

  return (
    <>
      {onboarding && <WelcomeWizard status={onboarding} />}

      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 style={{ fontSize: 25, fontFamily: "'Fraunces', serif", fontWeight: 600, margin: "0 0 3px" }}>
            Табло
          </h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {now.toLocaleDateString("bg-BG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <Link href="/dashboard/documents/new" className="btn btn-primary">
          + Нов документ
        </Link>
      </div>

      {/* Usage banner (free plan) */}
      {subscription?.plan === "free" && (
        <div className="glass usage-banner" style={{ borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>Документи този месец</span>
          <div style={{ flex: 1, minWidth: 140, height: 7, background: "var(--brass-soft)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--brass)", width: `${Math.min(100, (docsUsed / FREE_PLAN_LIMIT) * 100)}%` }} />
          </div>
          <span className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {docsUsed} / {FREE_PLAN_LIMIT}
          </span>
          <Link href="/dashboard/subscription" className="btn btn-ghost btn-sm">
            Upgrade
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          {
            label: "Приходи (месец)",
            value: formatCurrency(monthRevenue),
            bgn: dual ? `≈ ${formatCurrency(toBGN(monthRevenue), "BGN")}` : null,
            delta: null,
            color: "var(--emerald)",
          },
          {
            label: "Разходи (месец)",
            value: formatCurrency(monthExpenses),
            bgn: dual ? `≈ ${formatCurrency(toBGN(monthExpenses), "BGN")}` : null,
            delta: null,
            color: "var(--brick)",
          },
          {
            label: "Нетна печалба",
            value: formatCurrency(profit),
            bgn: dual ? `≈ ${formatCurrency(toBGN(profit), "BGN")}` : null,
            delta: profit >= 0 ? "▲ положителна" : "▼ отрицателна",
            deltaType: profit >= 0 ? "up" : "warn",
            color: "var(--navy)",
          },
          {
            label: "Просрочени фактури",
            value: String(overdueInvoices),
            bgn: null,
            delta: overdueInvoices > 0 ? "Изискват внимание" : "Всичко наред",
            deltaType: overdueInvoices > 0 ? "warn" : "up",
            color: "var(--brass)",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{kpi.label}</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 600 }}>{kpi.value}</div>
            {kpi.bgn && <div className="num" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{kpi.bgn}</div>}
            {kpi.delta && (
              <div style={{ fontSize: 11.5, marginTop: 6, color: kpi.deltaType === "up" ? "var(--emerald)" : "var(--brick)" }}>
                {kpi.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Бизнес здравен индекс + Напомняния за плащане */}
      {hasHealth && health && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 18, marginBottom: 18, alignItems: "start" }}>
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Бизнес здравен индекс</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", background: `conic-gradient(${health.score >= 70 ? "var(--emerald)" : health.score >= 40 ? "var(--brass)" : "var(--brick)"} ${health.score * 3.6}deg, rgba(217,215,200,.5) 0deg)` }} />
                <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{health.score}</span>
                  <span style={{ fontSize: 9, color: "var(--muted)" }}>/ 100</span>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                {health.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          </div>

          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Напомняния за плащане</h3>
            {paymentReminders.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма предстоящи или просрочени неплатени фактури.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {paymentReminders.map((r) => (
                  <Link key={r.id} href={`/dashboard/documents/${r.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", textDecoration: "none", color: "inherit" }}>
                    <span><strong>{r.client}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>· {r.number}</span></span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="num">{formatCurrency(r.total)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: r.daysOverdue > 0 ? "var(--brick)" : r.daysOverdue === 0 ? "var(--brass)" : "var(--emerald-dark)" }}>
                        {r.daysOverdue > 0 ? `просрочена с ${r.daysOverdue} дни` : r.daysOverdue === 0 ? "падеж днес" : `до падеж: ${-r.daysOverdue} дни`}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Топ клиенти по приход */}
      <div style={{ marginBottom: 18 }}>
        <TopClientsChart data={clientRevenue} />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "start" }}>
        {/* Recent documents */}
        <div className="glass panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Последни документи</h3>
            <Link href="/dashboard/documents" style={{ fontSize: 12.5, color: "var(--navy)", fontWeight: 600 }}>
              Всички →
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>
              Няма документи. <Link href="/dashboard/documents/new">Създайте първия</Link>
            </div>
          ) : (
            recentDocs.map((doc) => {
              const total = doc.lines.reduce((s, l) => s + l.lineTotal, 0);
              return (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: "1px solid rgba(217,215,200,.6)", textDecoration: "none", color: "inherit", gap: 10 }}
                >
                  <div>
                    <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{doc.number}</div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{doc.client?.name ?? "—"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontWeight: 600, fontSize: 13.5 }}>{formatCurrency(total)}</div>
                    {dual && <div className="num" style={{ fontSize: 10.5, color: "var(--muted)" }}>≈ {formatCurrency(toBGN(total), "BGN")}</div>}
                  </div>
                  <Stamp status={doc.status} />
                </Link>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Alerts */}
          {(lowStockItems.length > 0 || expiringContracts.length > 0) && (
            <div className="glass panel">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Известия</h3>
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.5)", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "var(--brick)", fontSize: 16 }}>⚠</span>
                  <span>Ниска наличност: <strong>{item.name}</strong> ({item.quantity} {item.unit})</span>
                </div>
              ))}
              {expiringContracts.map((c) => (
                <div key={c.id} style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.5)", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "var(--brass)", fontSize: 16 }}>⏰</span>
                  <span>Договор изтича: <strong>{c.title}</strong></span>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Бързи действия</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { href: "/dashboard/documents/new?type=invoice", label: "📄 Нова фактура" },
                { href: "/dashboard/clients/new", label: "👥 Нов клиент" },
                { href: "/dashboard/expenses/new", label: "💰 Нов разход" },
                { href: "/dashboard/warehouse/receive", label: "📦 Заприходяване" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* AI Copilot teaser */}
          <div className="copilot-card">
            <span style={{ fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "var(--brass)", fontWeight: 600, display: "block", marginBottom: 8 }}>
              AI Модул
            </span>
            <span style={{ position: "absolute", top: 16, right: 18, fontSize: 10.5, color: "var(--brass)", border: "1px solid var(--brass)", padding: "3px 9px", borderRadius: 20 }}>
              СКОРО
            </span>
            <h3 style={{ color: "#fff", margin: "0 0 10px", fontFamily: "'Fraunces', serif", fontSize: 15 }}>
              AI CFO Асистент
            </h3>
            <div style={{ fontSize: 13, color: "#C9C7B6", borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 }}>
              Прогнози, анализи на риска и CFO препоръки, базирани на вашите данни.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
