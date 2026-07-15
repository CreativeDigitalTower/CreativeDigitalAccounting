import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AdminCompanyRow } from "@/components/app/AdminCompanyRow";
import { AdminArchivedCompanies } from "@/components/app/AdminArchivedCompanies";
import { SUBSCRIPTION_PLANS, planPrice, accountantPlanLabel, accountantMaxClients } from "@/lib/constants";
import { computeFirmPartnerStats } from "@/lib/partner";
import { AdminFirmsPanel } from "@/components/app/AdminFirmsPanel";
import { buildPlatformOverview } from "@/lib/bi/platform";
import { PlatformOverview } from "@/components/bi/PlatformOverview";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { getT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const RANGES = [
  { id: "7d", days: 7, bucket: "day" as const },
  { id: "30d", days: 30, bucket: "day" as const },
  { id: "90d", days: 90, bucket: "day" as const },
  { id: "12m", days: 365, bucket: "month" as const },
  { id: "all", days: null, bucket: "month" as const },
];
const PLAN_PRICE: Record<string, number> = { free: planPrice("free"), start: planPrice("start"), business: planPrice("business"), pro: planPrice("pro") };

// Малка информационна иконка с пояснение (tooltip)
function Info({ text }: { text: string }) {
  // CSS hover tooltip (native title е ненадежден) — показва пояснението при посочване.
  return (
    <span className="cda-tip" style={{ display: "inline-flex", verticalAlign: "-2px", marginLeft: 5, color: "var(--muted)", cursor: "help", position: "relative" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>
      <span className="cda-tip-bubble">{text}</span>
    </span>
  );
}

const PV_RANGES = [
  { id: "today", days: 1 },
  { id: "7d", days: 7 },
  { id: "30d", days: 30 },
  { id: "12m", days: 365 },
  { id: "all", days: null as number | null },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string; pvRange?: string; pvFrom?: string; pvTo?: string }> }) {
  await requireSuperAdmin();
  const { t, locale } = await getT();
  const M = getMessages(locale).admin as Record<string, Record<string, string>>;
  const sp = await searchParams;
  const range = RANGES.find((r) => r.id === sp?.range) ?? RANGES[1]; // по подразбиране 30 дни

  const companies = await prisma.company.findMany({
    where: { archivedAt: null }, // архивираните се показват в отделен раздел долу
    include: {
      subscription: true,
      subscriptionEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      companyUsers: { include: { user: true } },
      _count: { select: { documents: true, companyUsers: true, clients: true, stockItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const archivedCompanies = await prisma.company.findMany({
    where: { archivedAt: { not: null } },
    select: { id: true, name: true, eik: true, archivedAt: true, subscription: { select: { plan: true } }, companyUsers: { select: { user: { select: { email: true } } }, take: 1 } },
    orderBy: { archivedAt: "desc" },
  });

  const planLabels = M.plan as Record<string, string>;
  const counts = companies.reduce((acc, c) => {
    const p = c.subscription?.plan ?? "free";
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ─── Бизнес показатели ───
  const [totalUsers, totalDocuments, allTimeVisitorRows, allTimeUserRows] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.siteVisit.findMany({ distinct: ["visitorId"], select: { visitorId: true } }),
    prisma.siteVisit.findMany({ where: { userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
  ]);
  const allTimeVisitors = allTimeVisitorRows.length;
  const allTimeUsers = allTimeUserRows.length;
  const paidCount = (counts.start ?? 0) + (counts.business ?? 0) + (counts.pro ?? 0);
  // Собственият акаунт не се заплаща — сумата му не се отчита като приход (MRR/ARR).
  const OWN_ACCOUNT_EMAIL = "office@creativedigitaltower.com";
  const isOwnAccount = (c: (typeof companies)[number]) =>
    c.companyUsers.some((cu) => cu.user?.email?.toLowerCase() === OWN_ACCOUNT_EMAIL);
  // Реален платящ абонат: платен план + статус „active" + РЪЧНО потвърдено
  // получено плащане (paymentStatus === "received") и да не е собственият акаунт.
  // Само тези влизат в MRR/ARR — така статистиката отчита реални продажби.
  const isPaying = (c: (typeof companies)[number]) => {
    const plan = c.subscription?.plan ?? "free";
    return plan !== "free" && c.subscription?.status === "active"
      && c.subscription?.paymentStatus === "received" && !isOwnAccount(c);
  };
  const payingCount = companies.filter(isPaying).length;
  // Платен план, но плащането още не е потвърдено (изчаква се / не е получено) — не влиза в приход.
  const awaitingList = companies.filter((c) => (c.subscription?.plan ?? "free") !== "free" && c.subscription?.status === "active" && c.subscription?.paymentStatus !== "received" && !isOwnAccount(c));
  const awaitingPaymentCount = awaitingList.length;
  // Фирми в пробен (безплатен) период — показваме ги отделно, но НЕ като приход.
  const trialingCount = companies.filter((c) => c.subscription?.status === "trialing" && (c.subscription?.plan ?? "free") !== "free").length;
  const mrr = companies.reduce((s, c) => s + (isPaying(c) ? (PLAN_PRICE[c.subscription?.plan ?? "free"] ?? 0) : 0), 0);
  const conversion = companies.length ? Math.round((paidCount / companies.length) * 100) : 0;

  // Сектори
  const sectorMap = new Map<string, number>();
  for (const c of companies) {
    const s = c.sector || t("admin.sectors.unspecified");
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1);
  }
  const sectors = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]);

  // ─── Приходи (MRR/ARR + платформена активност по фактури) ───
  const arr = mrr * 12;
  const nowD = new Date();
  const mStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
  const lmStart = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
  const platformInvoices = await prisma.document.findMany({
    where: { type: "invoice", issueDate: { gte: lmStart } },
    select: { issueDate: true, lines: { select: { lineTotal: true } } },
  });
  let invThisMonth = 0, invLastMonth = 0;
  for (const inv of platformInvoices) {
    const v = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    if (new Date(inv.issueDate) >= mStart) invThisMonth += v; else invLastMonth += v;
  }
  const invGrowth = invLastMonth > 0 ? Math.round(((invThisMonth - invLastMonth) / invLastMonth) * 100) : (invThisMonth > 0 ? 100 : 0);

  // Общо фактурирана стойност на платформата + документи по тип
  const [allInvoiceAgg, docsByType] = await Promise.all([
    prisma.documentLine.aggregate({ _sum: { lineTotal: true }, where: { document: { type: "invoice" } } }),
    prisma.document.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  const totalInvoiceValue = allInvoiceAgg._sum.lineTotal ?? 0;

  // ─── Фуния на продажбите ───
  const activatedCompanies = companies.filter((c) => c._count.clients > 0 || c._count.documents > 0).length;
  const firstInvoiceCompanies = (await prisma.document.groupBy({ by: ["companyId"], where: { type: "invoice" }, _count: { _all: true } })).length;
  const funnel = [
    { label: t("admin.funnel.visitors"), value: allTimeVisitors },
    { label: t("admin.funnel.registrations"), value: companies.length },
    { label: t("admin.funnel.activated"), value: activatedCompanies },
    { label: t("admin.funnel.firstInvoice"), value: firstInvoiceCompanies },
    { label: t("admin.funnel.paid"), value: paidCount },
  ];

  // ─── Използване на модулите (от посещенията в приложението) ───
  const appVisits = await prisma.siteVisit.findMany({ where: { area: "app" }, select: { path: true } });
  const moduleNames = M.moduleNames as Record<string, string>;
  const moduleUsage = new Map<string, number>();
  for (const v of appVisits) {
    const seg = v.path.split("/")[2] || "dashboard";
    if (moduleNames[seg]) moduleUsage.set(seg, (moduleUsage.get(seg) ?? 0) + 1);
  }
  const modulesSorted = [...moduleUsage.entries()].sort((a, b) => b[1] - a[1]);
  const maxModule = Math.max(1, ...modulesSorted.map(([, n]) => n));

  // Използване на публичните инструменти
  const toolNames = M.toolNames as Record<string, string>;

  // ─── Преглеждания по страници с избор на период (#14 + Вход/Регистрация) ───
  const pvRange = PV_RANGES.find((r) => r.id === sp?.pvRange) ?? PV_RANGES[2]; // по подразбиране 30 дни
  let pvFrom: Date | null = null, pvTo: Date | null = null, pvLabel = t(`admin.pvRanges.${pvRange.id}`);
  if (sp?.pvFrom && sp?.pvTo) {
    pvFrom = new Date(sp.pvFrom); pvFrom.setHours(0, 0, 0, 0);
    pvTo = new Date(sp.pvTo); pvTo.setHours(23, 59, 59, 999);
    pvLabel = `${pvFrom.toLocaleDateString(locale)} – ${pvTo.toLocaleDateString(locale)}`;
  } else if (pvRange.days != null) {
    pvFrom = pvRange.id === "today" ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(Date.now() - pvRange.days * 86400000);
  }
  const pvWhere = { area: "public", ...(pvFrom || pvTo ? { createdAt: { ...(pvFrom ? { gte: pvFrom } : {}), ...(pvTo ? { lte: pvTo } : {}) } } : {}) };
  const publicVisits = await prisma.siteVisit.findMany({ where: pvWhere, select: { path: true } });

  const pageLabels = M.pageLabels as Record<string, string>;
  const pageViews = new Map<string, number>();
  for (const v of publicVisits) pageViews.set(v.path, (pageViews.get(v.path) ?? 0) + 1);
  const pagesSorted = [...pageViews.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const totalPublicViews = publicVisits.length;
  const homeViews = pageViews.get("/") ?? 0;
  const loginViews = pageViews.get("/login") ?? 0;
  const registerViews = pageViews.get("/register") ?? 0;
  const totalAppViews = appVisits.length;
  const toolUsage = new Map<string, number>();
  for (const v of publicVisits) {
    const parts = v.path.split("/");
    if (parts[1] === "tools" && parts[2] && toolNames[parts[2]]) toolUsage.set(parts[2], (toolUsage.get(parts[2]) ?? 0) + 1);
  }

  // ─── Lead scoring / Revenue opportunities ───
  const usageCounters = await prisma.usageCounter.findMany({ where: { yearMonth: `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}` } });
  const usageByCompany = new Map(usageCounters.map((u) => [u.companyId, u.documentsIssuedCount]));
  const planLimit: Record<string, number> = { free: SUBSCRIPTION_PLANS.free.docsPerMonth, start: SUBSCRIPTION_PLANS.start.docsPerMonth, business: SUBSCRIPTION_PLANS.business.docsPerMonth, pro: SUBSCRIPTION_PLANS.pro.docsPerMonth };

  const leads = companies.map((c) => {
    const plan = c.subscription?.plan ?? "free";
    let score = 0;
    if (c.logoUrl) score += 15;
    if (c._count.clients >= 3) score += 20;
    if (c._count.documents >= 5) score += 30;
    if (c._count.stockItems >= 10) score += 20;
    if (c._count.companyUsers >= 2) score += 15;
    const used = usageByCompany.get(c.id) ?? 0;
    const limit = planLimit[plan];
    const nearLimit = limit !== Infinity && used >= limit * 0.8;
    return { id: c.id, name: c.name, plan, score, used, limit, nearLimit };
  });
  const hotLeads = leads.filter((l) => l.plan === "free").sort((a, b) => b.score - a.score).slice(0, 5);
  const upgradeOpportunities = leads.filter((l) => l.nearLimit && l.plan !== "pro").sort((a, b) => b.used - a.used).slice(0, 5);

  // ─── Customer success: неактивни фирми ───
  const lastActivity = new Map<string, Date>();
  const appByCompany = await prisma.siteVisit.findMany({ where: { area: "app", companyId: { not: null } }, select: { companyId: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  for (const v of appByCompany) { if (v.companyId && !lastActivity.has(v.companyId)) lastActivity.set(v.companyId, v.createdAt); }
  // Последна активност = по-скорошното от (вход в приложението) и (издаден документ)
  const lastDocByCompany = new Map<string, Date>();
  const lastDocs = await prisma.document.groupBy({ by: ["companyId"], _max: { createdAt: true } });
  for (const d of lastDocs) { if (d.companyId && d._max.createdAt) lastDocByCompany.set(d.companyId, d._max.createdAt); }
  const lastActivityAt = (id: string): Date | null => {
    const a = lastActivity.get(id); const b = lastDocByCompany.get(id);
    if (a && b) return a > b ? a : b;
    return a ?? b ?? null;
  };
  const daysSince = (d?: Date | null) => d ? Math.floor((nowD.getTime() - new Date(d).getTime()) / 86400000) : Infinity;
  const inactive = companies.map((c) => ({ id: c.id, name: c.name, plan: c.subscription?.plan ?? "free", days: daysSince(lastActivity.get(c.id)) }))
    .filter((c) => c.days >= 7).sort((a, b) => b.days - a.days).slice(0, 8);

  // ─── Допълнителни показатели за растеж и активност ───
  const growthMonthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
  const growthPrevStart = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
  const newThisMonth = companies.filter((c) => new Date(c.createdAt) >= growthMonthStart).length;
  const newPrevMonth = companies.filter((c) => new Date(c.createdAt) >= growthPrevStart && new Date(c.createdAt) < growthMonthStart).length;
  const avgDocsPerCompany = companies.length ? Math.round(totalDocuments / companies.length) : 0;
  const active30 = companies.filter((c) => daysSince(lastActivityAt(c.id)) <= 30).length;
  const activationRate = companies.length ? Math.round((activatedCompanies / companies.length) * 100) : 0;
  const churnRisk = companies.filter((c) => (c.subscription?.plan ?? "free") !== "free" && daysSince(lastActivityAt(c.id)) >= 21).length;

  // ─── Автоматични известия ───
  const adminAlerts: string[] = [];
  for (const o of upgradeOpportunities) adminAlerts.push(t("admin.alerts.nearLimit", { name: o.name, used: o.used, limit: o.limit === Infinity ? "∞" : o.limit }));
  for (const l of hotLeads.filter((x) => x.score >= 70)) adminAlerts.push(t("admin.alerts.hotLead", { name: l.name, score: l.score }));
  if (invThisMonth > 100000) adminAlerts.push(t("admin.alerts.turnover", { amount: Math.round(invThisMonth).toLocaleString(locale) }));

  // ─── Посещения (по избран период; броим ХОРА, не презареждания) ───
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  let since: Date | null = null;
  if (range.days) { since = new Date(dayStart); since.setDate(since.getDate() - (range.days - 1)); }

  const visits = await prisma.siteVisit.findMany({
    where: since ? { createdAt: { gte: since } } : {},
    select: { visitorId: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const keyOf = (d: Date) => range.bucket === "day"
    ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    : `${d.getFullYear()}-${d.getMonth()}`;
  const labelOf = (d: Date) => range.bucket === "day"
    ? `${d.getDate()}.${d.getMonth() + 1}`
    : `${new Intl.DateTimeFormat(locale, { month: "short" }).format(d)} ${String(d.getFullYear()).slice(2)}`;

  type Bucket = { label: string; visitorSet: Set<string>; userSet: Set<string> };
  const bucketMap = new Map<string, Bucket>();
  const ensure = (key: string, label: string) => {
    if (!bucketMap.has(key)) bucketMap.set(key, { label, visitorSet: new Set(), userSet: new Set() });
    return bucketMap.get(key)!;
  };
  if (range.bucket === "day" && range.days) {
    for (let i = range.days - 1; i >= 0; i--) { const d = new Date(dayStart); d.setDate(d.getDate() - i); ensure(keyOf(d), labelOf(d)); }
  } else if (range.id === "12m") {
    for (let i = 11; i >= 0; i--) { const d = new Date(dayStart.getFullYear(), dayStart.getMonth() - i, 1); ensure(keyOf(d), labelOf(d)); }
  }
  const todayVisitorSet = new Set<string>();
  const todayUserSet = new Set<string>();
  for (const v of visits) {
    const d = new Date(v.createdAt);
    const b = ensure(keyOf(d), labelOf(d));
    b.visitorSet.add(v.visitorId);
    if (v.userId) b.userSet.add(v.userId);
    if (d >= dayStart) { todayVisitorSet.add(v.visitorId); if (v.userId) todayUserSet.add(v.userId); }
  }
  const buckets = [...bucketMap.values()];
  const maxBucket = Math.max(1, ...buckets.map((b) => b.visitorSet.size));

  const rangeVisitors = new Set(visits.map((v) => v.visitorId)).size;
  const rangeUsers = new Set(visits.filter((v) => v.userId).map((v) => v.userId)).size;
  const todayVisitors = todayVisitorSet.size;
  const todayActiveUsers = todayUserSet.size;
  const newCompanies = companies.filter((c) => !since || new Date(c.createdAt) >= since).length;

  // ─── Счетоводни къщи · партньорска статистика ───
  const firmsList = companies.filter((c) => c.isAccountingFirm);
  const firmStats = await Promise.all(firmsList.map(async (f) => {
    const stats = await computeFirmPartnerStats({ id: f.id, partnerCode: f.partnerCode, partnerPercentOverride: f.partnerPercentOverride, commissionPaidTotal: f.commissionPaidTotal });
    const max = accountantMaxClients(f.firmPlan);
    return {
      id: f.id, name: f.name, planLabel: accountantPlanLabel(f.firmPlan),
      firmPlan: f.firmPlan ?? "acc_start",
      paymentStatus: f.subscription?.paymentStatus ?? "pending",
      maxClients: max === Infinity ? "∞" : String(max),
      totalClients: stats.totalClients, startClients: stats.startClients, paidClients: stats.paidClients,
      ratePercent: stats.ratePercent, overridePercent: f.partnerPercentOverride, monthlyCommission: stats.monthlyCommission,
      paidTotal: stats.paidTotal, pendingRequests: stats.pendingRequests,
    };
  }));
  const firmRows = firmStats;
  const firmNameById = new Map(firmsList.map((f) => [f.id, f.name]));
  const pendingPayouts = firmsList.length
    ? await prisma.commissionPayout.findMany({ where: { status: "requested" }, orderBy: { requestedAt: "desc" } })
    : [];
  const payoutRows = pendingPayouts.map((p) => ({ id: p.id, firmId: p.firmId, firmName: firmNameById.get(p.firmId) ?? "—", amount: p.amount, requestedAt: p.requestedAt.toISOString() }));

  // ─── Executive Overview (Обзор на платформата) ───
  const inactivePaidList = companies
    .filter((c) => (c.subscription?.plan ?? "free") !== "free" && daysSince(lastActivityAt(c.id)) >= 21)
    .map((c) => ({ id: c.id, name: c.name, days: daysSince(lastActivityAt(c.id)) }))
    .sort((a, b) => b.days - a.days).slice(0, 6);
  const platformOverview = await buildPlatformOverview({
    companies, mrr, arr, payingCount, paidCount, trialingCount,
    awaitingList: awaitingList.map((c) => ({ id: c.id, name: c.name })), conversion,
    newThisMonth, newPrevMonth, active30, churnRisk,
    firmStats, payoutRows,
    upgradeOpportunities: upgradeOpportunities.map((o) => ({ id: o.id, name: o.name, plan: o.plan, used: o.used, limit: o.limit })),
    hotLeads: hotLeads.map((l) => ({ id: l.id, name: l.name, plan: l.plan, score: l.score })),
    inactivePaid: inactivePaidList,
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 10 }}>
            <NavIcon.subscription width={22} height={22} /> {t("admin.title")}
          </h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("admin.companiesCount", { n: companies.length })}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/admin/emails" className="btn btn-ghost btn-sm">{t("admin.nav.emails")}</Link>
          <Link href="/dashboard/admin/blog" className="btn btn-ghost btn-sm">{t("admin.nav.blog")}</Link>
          <Link href="/dashboard/admin/businesses" className="btn btn-ghost btn-sm">{t("admin.nav.businesses")}</Link>
        </div>
      </div>

      {/* ═══ Обзор на платформата (BI Executive Overview) ═══ */}
      <PlatformOverview data={platformOverview} />

      {/* ─── Счетоводни къщи · Партньорска програма ─── */}
      <div id="firms">
        <AdminFirmsPanel firms={firmRows} payouts={payoutRows} />
      </div>

      {/* Чакащи потвърждение на плащане */}
      {awaitingList.length > 0 && (
        <div id="awaiting" className="glass panel" style={{ marginBottom: 16, borderLeft: "4px solid var(--brass)", background: "var(--brass-soft)", scrollMarginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--brass)", marginBottom: 6 }}>
            {t("admin.awaiting.title", { n: awaitingList.length })}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
            {t("admin.awaiting.desc")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {awaitingList.map((c) => (
              <span key={c.id} style={{ fontSize: 12, fontWeight: 600, background: "#fff", borderRadius: 14, padding: "3px 11px" }}>
                {c.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {planLabels[c.subscription?.plan ?? "free"]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Plan distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        {(["free", "start", "business", "pro"] as const).map((p) => (
          <div key={p} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{planLabels[p]}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{counts[p] ?? 0}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t("admin.companiesWord")}</div>
          </div>
        ))}
      </div>

      {/* Бизнес показатели */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("admin.kpi.registeredCompanies")}<Info text={t("admin.kpi.registeredCompaniesInfo")} /></div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{companies.length.toLocaleString(locale)}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("admin.kpi.registeredUsers")}<Info text={t("admin.kpi.registeredUsersInfo")} /></div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{totalUsers.toLocaleString(locale)}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("admin.kpi.issuedDocs")}</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{totalDocuments.toLocaleString(locale)}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("admin.kpi.mrr")}<Info text={t("admin.kpi.mrrInfo")} /></div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--emerald-dark)" }}>{mrr.toLocaleString(locale)} €</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t("admin.kpi.mrrPaying", { n: payingCount })}{awaitingPaymentCount > 0 ? t("admin.kpi.mrrAwaiting", { n: awaitingPaymentCount }) : ""}{trialingCount > 0 ? t("admin.kpi.mrrTrialing", { n: trialingCount }) : ""}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{t("admin.kpi.conversion")}<Info text={t("admin.kpi.conversionInfo")} /></div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{conversion}%</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t("admin.kpi.conversionSub", { paid: paidCount, total: companies.length })}</div>
        </div>
      </div>

      {/* Приходи */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.revenue.mrr")}<Info text={t("admin.revenue.mrrInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{mrr.toLocaleString(locale)} €</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.revenue.arr")}<Info text={t("admin.revenue.arrInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{arr.toLocaleString(locale)} €</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.revenue.turnoverThis")}<Info text={t("admin.revenue.turnoverInfo")} /></div><div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(invThisMonth).toLocaleString(locale)} €</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.revenue.turnoverLast")}</div><div className="num" style={{ fontSize: 18, fontWeight: 700, color: "var(--muted)" }}>{Math.round(invLastMonth).toLocaleString(locale)} €</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.revenue.growth")}<Info text={t("admin.revenue.growthInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: invGrowth >= 0 ? "var(--emerald-dark)" : "var(--brick)" }}>{invGrowth >= 0 ? "+" : ""}{invGrowth}%</div></div>
      </div>

      {/* Растеж и активност */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.growth.newThisMonth")}<Info text={t("admin.growth.newInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{newThisMonth}<span style={{ fontSize: 12, color: newThisMonth >= newPrevMonth ? "var(--emerald-dark)" : "var(--brick)", marginLeft: 6 }}>{t("admin.growth.newPrevMonth", { n: newPrevMonth })}</span></div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.growth.active30")}<Info text={t("admin.growth.active30Info")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{active30}</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.growth.activated")}<Info text={t("admin.growth.activatedInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{activationRate}%</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.growth.avgDocs")}<Info text={t("admin.growth.avgDocsInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{avgDocsPerCompany}</div></div>
        <div className="glass kpi-card"><div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{t("admin.growth.churnRisk")}<Info text={t("admin.growth.churnRiskInfo")} /></div><div className="num" style={{ fontSize: 20, fontWeight: 700, color: churnRisk > 0 ? "var(--brick)" : "var(--emerald-dark)" }}>{churnRisk}</div></div>
      </div>

      {/* Документи по тип + обща стойност */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {docsByType.map((d) => (
              <div key={d.type} style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>{M.docType[d.type] ?? d.type}:</span> <strong className="num">{d._count._all}</strong>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13 }}>{t("admin.docs.totalValue")}<Info text={t("admin.docs.totalValueInfo")} />: <strong className="num" style={{ color: "var(--emerald-dark)" }}>{Math.round(totalInvoiceValue).toLocaleString(locale)} €</strong></div>
        </div>
      </div>

      {/* Автоматични известия */}
      {adminAlerts.length > 0 && (
        <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 20, borderLeft: "4px solid var(--brass)" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("admin.alerts.title")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {adminAlerts.map((a, i) => <div key={i} style={{ fontSize: 13, color: "var(--ink-soft)" }}>{a}</div>)}
          </div>
        </div>
      )}

      {/* Фуния на продажбите */}
      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("admin.funnel.title")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {funnel.map((f, i) => {
            const top = funnel[0].value || 1;
            const pct = Math.round((f.value / top) * 100);
            const prev = i > 0 ? funnel[i - 1].value : null;
            const conv = prev && prev > 0 ? Math.round((f.value / prev) * 100) : null;
            return (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span>{f.label}</span>
                  <span><strong className="num">{f.value.toLocaleString(locale)}</strong>{conv != null && <span style={{ color: "var(--muted)", marginLeft: 8 }}>{t("admin.funnel.ofPrev", { n: conv })}</span>}</span>
                </div>
                <div style={{ height: 22, background: "rgba(217,215,200,.4)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(3, pct)}%`, height: "100%", background: i === funnel.length - 1 ? "var(--emerald)" : "var(--navy)", borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Преглеждания по страници (#14) */}
      <div className="glass panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("admin.pageViews.title")} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>· {pvLabel}</span></h3>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {PV_RANGES.map((r) => (
              <Link key={r.id} href={`/dashboard/admin?pvRange=${r.id}`} className={`filter-tab${!sp?.pvFrom && pvRange.id === r.id ? " active" : ""}`} style={{ fontSize: 11.5 }}>{t(`admin.pvRanges.${r.id}`)}</Link>
            ))}
            <form method="get" action="/dashboard/admin" style={{ display: "inline-flex", gap: 4, alignItems: "center", marginLeft: 4 }}>
              <input type="date" name="pvFrom" defaultValue={sp?.pvFrom} required style={{ width: "auto", padding: "4px 6px", fontSize: 11.5 }} />
              <span style={{ color: "var(--muted)" }}>–</span>
              <input type="date" name="pvTo" defaultValue={sp?.pvTo} required style={{ width: "auto", padding: "4px 6px", fontSize: 11.5 }} />
              <button type="submit" className="btn btn-ghost btn-sm" style={{ fontSize: 11.5 }}>{t("admin.pageViews.show")}</button>
            </form>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
          {[
            { l: t("admin.pageViews.home"), v: homeViews, c: "var(--emerald-dark)" },
            { l: t("admin.pageViews.login"), v: loginViews, c: "var(--navy)" },
            { l: t("admin.pageViews.register"), v: registerViews, c: "var(--brass)" },
            { l: t("admin.pageViews.allPublic"), v: totalPublicViews, c: "var(--ink)" },
            { l: t("admin.pageViews.inApp"), v: totalAppViews, c: "var(--muted)" },
          ].map((s) => (
            <div key={s.l} className="glass kpi-card" style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.l}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
        {pagesSorted.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("admin.pageViews.noData")}</div> : (
          <table>
            <thead><tr><th>{t("admin.pageViews.thPage")}</th><th>{t("admin.pageViews.thPath")}</th><th className="num">{t("admin.pageViews.thViews")}</th></tr></thead>
            <tbody>
              {pagesSorted.map(([path, n]) => (
                <tr key={path}>
                  <td style={{ fontWeight: 600 }}>{pageLabels[path] ?? path}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{path}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{t("admin.pageViews.note")}</p>
      </div>

      {/* Модули + инструменти */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("admin.modules.title")}</h3>
          {modulesSorted.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("admin.modules.noData")}</div> : modulesSorted.slice(0, 12).map(([seg, n]) => (
            <div key={seg} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 2 }}><span>{moduleNames[seg]}</span><span className="num" style={{ color: "var(--muted)" }}>{n}</span></div>
              <div style={{ height: 5, background: "rgba(217,215,200,.5)", borderRadius: 3 }}><div style={{ width: `${(n / maxModule) * 100}%`, height: "100%", background: "var(--navy)", borderRadius: 3 }} /></div>
            </div>
          ))}
        </div>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("admin.tools.title")}</h3>
          {Object.keys(toolNames).map((k) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>{toolNames[k]} {t("admin.tools.calcSuffix")}</span><span className="num">{toolUsage.get(k) ?? 0}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>{t("admin.tools.note")}</p>
        </div>
      </div>

      {/* Lead scoring + Revenue opportunities + Customer success */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20, alignItems: "start" }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}><UiIcon.warning width={15} height={15}/> {t("admin.leads.hotTitle")}</h3>
          {hotLeads.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> : hotLeads.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>{l.name}</span><strong className="num" style={{ color: l.score >= 70 ? "var(--emerald-dark)" : "var(--ink)" }}>{l.score}/100</strong>
            </div>
          ))}
        </div>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}><NavIcon.expenses width={15} height={15}/> {t("admin.leads.upgradeTitle")}</h3>
          {upgradeOpportunities.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div> : upgradeOpportunities.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>{o.name} <span style={{ color: "var(--muted)" }}>({o.plan})</span></span><strong className="num" style={{ color: "var(--brick)" }}>{o.used}/{o.limit === Infinity ? "∞" : o.limit}</strong>
            </div>
          ))}
        </div>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("admin.leads.inactiveTitle")}</h3>
          {inactive.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("admin.leads.allActive")}</div> : inactive.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>{c.name}</span><span style={{ color: c.days >= 30 ? "var(--brick)" : "var(--muted)" }}>{c.days === Infinity ? t("admin.leads.never") : t("admin.leads.days", { n: c.days })}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Посещения — с избор на период */}
      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("admin.visits.title")}</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {RANGES.map((r) => (
              <Link key={r.id} href={`/dashboard/admin?range=${r.id}`}
                className={`filter-tab${range.id === r.id ? " active" : ""}`} style={{ fontSize: 11.5 }}>
                {t(`admin.ranges.${r.id}`)}
              </Link>
            ))}
          </div>
        </div>

        {/* KPIs за избрания период */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <div style={{ background: "var(--navy-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("admin.visits.todayVisitors")}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{todayVisitors}</div>
          </div>
          <div style={{ background: "var(--emerald-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("admin.visits.todayActive")}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{todayActiveUsers}</div>
          </div>
          <div style={{ background: "var(--navy-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("admin.visits.visitorsRange", { range: t(`admin.ranges.${range.id}`).toLowerCase() })}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{rangeVisitors}</div>
          </div>
          <div style={{ background: "var(--emerald-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("admin.visits.activeRange", { range: t(`admin.ranges.${range.id}`).toLowerCase() })}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{rangeUsers}</div>
          </div>
        </div>

        {buckets.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>{t("admin.visits.noData")}</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150, overflowX: "auto", paddingBottom: 4 }}>
              {buckets.map((b, i) => (
                <div key={i} style={{ minWidth: 30, flex: "1 0 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)" }} className="num">{b.visitorSet.size}</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 90 }}>
                    <div title={t("admin.visits.barTitle", { label: b.label, v: b.visitorSet.size, u: b.userSet.size })}
                      style={{ height: `${(b.visitorSet.size / maxBucket) * 100}%`, minHeight: 2, background: i === buckets.length - 1 ? "var(--emerald)" : "var(--navy)", borderRadius: "4px 4px 0 0" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted)", whiteSpace: "nowrap" }}>{b.label}</div>
                  <div style={{ fontSize: 9, color: "var(--emerald-dark)", fontWeight: 600 }} className="num">{b.userSet.size}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11.5, color: "var(--muted)" }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 5 }} />{t("admin.visits.legendVisitors")}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}><UiIcon.people width={14} height={14}/> {t("admin.visits.legendActive")}</span>
              <span style={{ marginLeft: "auto" }}>{t("admin.visits.allTime", { v: allTimeVisitors.toLocaleString(locale), u: allTimeUsers.toLocaleString(locale) })}</span>
            </div>
          </>
        )}
      </div>

      {/* Разпределение по сектори + нови фирми */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("admin.sectors.title")}</h3>
          {sectors.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>—</div> : sectors.map(([name, n]) => {
            const max = sectors[0][1];
            return (
              <div key={name} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span>{name}</span><span className="num" style={{ color: "var(--muted)" }}>{n}</span>
                </div>
                <div style={{ height: 6, background: "rgba(217,215,200,.5)", borderRadius: 3 }}>
                  <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: "var(--brass)", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("admin.growthPanel.title")}</h3>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 2 }}>
            <div>{t("admin.growthPanel.newCompanies", { range: t(`admin.ranges.${range.id}`).toLowerCase() })}: <strong className="num">{newCompanies}</strong></div>
            <div>{t("admin.growthPanel.total")}: <strong className="num">{companies.length}</strong></div>
            <div>{t("admin.growthPanel.paid")}: <strong className="num">{paidCount}</strong></div>
            <div>{t("admin.growthPanel.free")}: <strong className="num">{counts.free ?? 0}</strong></div>
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{t("admin.companies.title")}</h2>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 10 }}>{t("admin.companies.subtitle")}</div>
      <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>{t("admin.companies.thCompany")}</th>
              <th>{t("admin.companies.thActivity")}</th>
              <th>{t("admin.companies.thEik")}</th>
              <th className="num">{t("admin.companies.thUsers")}</th>
              <th className="num">{t("admin.companies.thDocs")}</th>
              <th>{t("admin.companies.thRegistration")}</th>
              <th>{t("admin.companies.thSubscription")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.filter((c) => !c.isAccountingFirm).map((c) => (
              <AdminCompanyRow
                key={c.id}
                id={c.id}
                name={c.name}
                eik={c.eik}
                plan={c.subscription?.plan ?? "free"}
                status={c.subscription?.status ?? "active"}
                users={c._count.companyUsers}
                docs={c._count.documents}
                createdAt={new Date(c.createdAt).toLocaleDateString(locale)}
                lastActivity={lastActivityAt(c.id)?.toISOString() ?? null}
                owners={c.companyUsers.map((cu) => cu.user.email).slice(0, 2).join(", ")}
                details={{
                  vatNumber: c.vatNumber, address: c.address, city: c.city,
                  mol: c.mol, sector: c.sector, phone: c.phone, email: c.email,
                }}
                members={c.companyUsers.map((cu) => ({
                  name: cu.user.name, email: cu.user.email, representativeRole: cu.user.representativeRole, role: cu.role,
                  marketingConsent: cu.user.marketingConsent, termsAcceptedAt: cu.user.termsAcceptedAt?.toISOString() ?? null,
                  createdAt: cu.user.createdAt.toISOString(),
                }))}
                sub={{
                  status: c.subscription?.status ?? "active",
                  paymentStatus: c.subscription?.paymentStatus ?? "pending",
                  periodStart: c.subscription?.currentPeriodStart?.toISOString() ?? null,
                  periodEnd: c.subscription?.currentPeriodEnd?.toISOString() ?? null,
                  trialUsed: c.subscription?.trialUsed ?? false,
                }}
                events={c.subscriptionEvents.map((e) => ({ type: e.type, plan: e.plan, status: e.status, period: e.period, amount: e.amount, note: e.note, createdAt: e.createdAt.toISOString() }))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        {t("admin.companies.note")}
      </p>

      {/* ─── Архивирани / изтрити фирми ─── */}
      <AdminArchivedCompanies
        companies={archivedCompanies.map((c) => ({
          id: c.id, name: c.name, eik: c.eik, plan: c.subscription?.plan ?? "free",
          owner: c.companyUsers[0]?.user.email ?? "—",
          archivedAt: c.archivedAt ? c.archivedAt.toLocaleDateString(locale) : "",
        }))}
      />
    </>
  );
}
