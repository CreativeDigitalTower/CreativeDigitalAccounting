import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AdminCompanyRow } from "@/components/app/AdminCompanyRow";

const RANGES = [
  { id: "7d", label: "7 дни", days: 7, bucket: "day" as const },
  { id: "30d", label: "30 дни", days: 30, bucket: "day" as const },
  { id: "90d", label: "90 дни", days: 90, bucket: "day" as const },
  { id: "12m", label: "12 месеца", days: 365, bucket: "month" as const },
  { id: "all", label: "Цял период", days: null, bucket: "month" as const },
];
const MONTH_NAMES = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
const PLAN_PRICE: Record<string, number> = { free: 0, start: 9, business: 29, pro: 59 };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const range = RANGES.find((r) => r.id === sp?.range) ?? RANGES[1]; // по подразбиране 30 дни

  const companies = await prisma.company.findMany({
    include: {
      subscription: true,
      companyUsers: { include: { user: true } },
      _count: { select: { documents: true, companyUsers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const planLabels: Record<string, string> = { free: "Безплатен", start: "Старт", business: "Бизнес", pro: "Про" };
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
  const mrr = companies.reduce((s, c) => s + (PLAN_PRICE[c.subscription?.plan ?? "free"] ?? 0), 0);
  const conversion = companies.length ? Math.round((paidCount / companies.length) * 100) : 0;

  // Сектори
  const sectorMap = new Map<string, number>();
  for (const c of companies) {
    const s = c.sector || "Непосочен";
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1);
  }
  const sectors = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]);

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
    : `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

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

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>
          🛡️ Супер Админ
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{companies.length} регистрирани фирми</div>
      </div>

      {/* Plan distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        {(["free", "start", "business", "pro"] as const).map((p) => (
          <div key={p} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{planLabels[p]}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{counts[p] ?? 0}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>фирми</div>
          </div>
        ))}
      </div>

      {/* Бизнес показатели */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Регистрирани потребители</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{totalUsers.toLocaleString("bg-BG")}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Издадени документи</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{totalDocuments.toLocaleString("bg-BG")}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Очакван месечен приход (MRR)</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--emerald-dark)" }}>{mrr.toLocaleString("bg-BG")} €</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Конверсия към платен план</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{conversion}%</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{paidCount} от {companies.length} фирми</div>
        </div>
      </div>

      {/* Посещения — с избор на период */}
      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Посещения и активност на сайта</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {RANGES.map((r) => (
              <Link key={r.id} href={`/dashboard/admin?range=${r.id}`}
                className={`filter-tab${range.id === r.id ? " active" : ""}`} style={{ fontSize: 11.5 }}>
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {/* KPIs за избрания период */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <div style={{ background: "var(--navy-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Посетители днес</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{todayVisitors}</div>
          </div>
          <div style={{ background: "var(--emerald-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Активни регистрирани днес</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{todayActiveUsers}</div>
          </div>
          <div style={{ background: "var(--navy-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Посетители ({range.label.toLowerCase()})</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{rangeVisitors}</div>
          </div>
          <div style={{ background: "var(--emerald-soft)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Активни регистрирани ({range.label.toLowerCase()})</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald-dark)" }}>{rangeUsers}</div>
          </div>
        </div>

        {buckets.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Все още няма натрупани данни за този период.</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150, overflowX: "auto", paddingBottom: 4 }}>
              {buckets.map((b, i) => (
                <div key={i} style={{ minWidth: 30, flex: "1 0 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)" }} className="num">{b.visitorSet.size}</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 90 }}>
                    <div title={`${b.label}: ${b.visitorSet.size} посетители · ${b.userSet.size} активни регистрирани`}
                      style={{ height: `${(b.visitorSet.size / maxBucket) * 100}%`, minHeight: 2, background: i === buckets.length - 1 ? "var(--emerald)" : "var(--navy)", borderRadius: "4px 4px 0 0" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted)", whiteSpace: "nowrap" }}>{b.label}</div>
                  <div style={{ fontSize: 9, color: "var(--emerald-dark)", fontWeight: 600 }} className="num">{b.userSet.size}👤</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11.5, color: "var(--muted)" }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 5 }} />Посетители (хора)</span>
              <span>👤 Активни регистрирани потребители</span>
              <span style={{ marginLeft: "auto" }}>Общо за периода на сайта: {allTimeVisitors.toLocaleString("bg-BG")} посетители · {allTimeUsers.toLocaleString("bg-BG")} активни</span>
            </div>
          </>
        )}
      </div>

      {/* Разпределение по сектори + нови фирми */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>
        <div className="glass panel">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Фирми по сектор</h3>
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
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Растеж</h3>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 2 }}>
            <div>Нови фирми ({range.label.toLowerCase()}): <strong className="num">{newCompanies}</strong></div>
            <div>Общо фирми: <strong className="num">{companies.length}</strong></div>
            <div>Платени фирми: <strong className="num">{paidCount}</strong></div>
            <div>Безплатни фирми: <strong className="num">{counts.free ?? 0}</strong></div>
          </div>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Фирма</th>
              <th>ЕИК</th>
              <th className="num">Потр.</th>
              <th className="num">Док.</th>
              <th>Регистрация</th>
              <th>Абонамент</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <AdminCompanyRow
                key={c.id}
                id={c.id}
                name={c.name}
                eik={c.eik}
                plan={c.subscription?.plan ?? "free"}
                status={c.subscription?.status ?? "active"}
                users={c._count.companyUsers}
                docs={c._count.documents}
                createdAt={new Date(c.createdAt).toLocaleDateString("bg-BG")}
                owners={c.companyUsers.map((cu) => cu.user.email).slice(0, 2).join(", ")}
                details={{
                  vatNumber: c.vatNumber, address: c.address, city: c.city,
                  mol: c.mol, sector: c.sector, phone: c.phone, email: c.email,
                }}
                members={c.companyUsers.map((cu) => ({
                  name: cu.user.name, email: cu.user.email, representativeRole: cu.user.representativeRole,
                  marketingConsent: cu.user.marketingConsent, termsAcceptedAt: cu.user.termsAcceptedAt?.toISOString() ?? null,
                  createdAt: cu.user.createdAt.toISOString(),
                }))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        Смяната на абонамент влиза в сила веднага — функционалностите се отключват/заключват автоматично за съответната фирма.
        „Влез в акаунта" ви дава технически достъп до акаунта на фирмата за съдействие.
      </p>
    </>
  );
}
