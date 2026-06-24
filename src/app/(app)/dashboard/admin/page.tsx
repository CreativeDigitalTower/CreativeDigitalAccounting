import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminCompanyRow } from "@/components/app/AdminCompanyRow";

export default async function AdminPage() {
  await requireSuperAdmin();

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

  // ─── Статистика на посещенията (последни 7 дни) ───
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart); weekStart.setDate(weekStart.getDate() - 6);
  const visits = await prisma.siteVisit.findMany({
    where: { createdAt: { gte: weekStart } },
    select: { visitorId: true, userId: true, createdAt: true },
  });

  const DAY_NAMES = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return { date: d, label: DAY_NAMES[d.getDay()], visits: 0, visitorSet: new Set<string>(), userSet: new Set<string>() };
  });
  for (const v of visits) {
    const idx = Math.floor((new Date(v.createdAt).setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    if (idx < 0 || idx > 6) continue;
    days[idx].visits++;
    days[idx].visitorSet.add(v.visitorId);
    if (v.userId) days[idx].userSet.add(v.userId);
  }
  const today = days[6];
  const todayVisits = today.visits;
  const todayVisitors = today.visitorSet.size;
  const todayActiveUsers = today.userSet.size;
  const maxVisits = Math.max(1, ...days.map((d) => d.visits));

  // ─── Пълна статистика за целия период (по месеци) ───
  const allVisits = await prisma.siteVisit.findMany({
    select: { visitorId: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const allTimeVisitors = new Set<string>();
  const allTimeUsers = new Set<string>();
  const MONTH_NAMES = ["Ян", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
  const monthMap = new Map<string, { label: string; visits: number; visitorSet: Set<string>; userSet: Set<string> }>();
  for (const v of allVisits) {
    allTimeVisitors.add(v.visitorId);
    if (v.userId) allTimeUsers.add(v.userId);
    const d = new Date(v.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!monthMap.has(key)) monthMap.set(key, { label: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, visits: 0, visitorSet: new Set(), userSet: new Set() });
    const m = monthMap.get(key)!;
    m.visits++;
    m.visitorSet.add(v.visitorId);
    if (v.userId) m.userSet.add(v.userId);
  }
  const months = [...monthMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v);
  const maxMonthVisits = Math.max(1, ...months.map((m) => m.visits));
  const allTimeVisits = allVisits.length;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>
          🛡️ Супер Админ
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{companies.length} регистрирани фирми</div>
      </div>

      {/* Plan distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {(["free", "start", "business", "pro"] as const).map((p) => (
          <div key={p} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{planLabels[p]}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{counts[p] ?? 0}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>фирми</div>
          </div>
        ))}
      </div>

      {/* Статистика на посещенията */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Посещения днес</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{todayVisits}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>прегледани страници</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Уникални посетители днес</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{todayVisitors}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>вкл. анонимни</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Активни регистрирани днес</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--emerald-dark)" }}>{todayActiveUsers}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>потребители на фирми</div>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 16px" }}>Активност през последните 7 дни</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }} className="num">{d.visits}</div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 80 }}>
                <div title={`${d.visits} посещения · ${d.visitorSet.size} уникални · ${d.userSet.size} активни`}
                  style={{ height: `${(d.visits / maxVisits) * 100}%`, minHeight: 3, background: i === 6 ? "var(--emerald)" : "var(--navy)", borderRadius: "4px 4px 0 0" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{d.label}</div>
              <div style={{ fontSize: 10, color: "var(--emerald-dark)", fontWeight: 600 }} className="num">{d.userSet.size}👤</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11.5, color: "var(--muted)" }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 5 }} />Посещения / ден</span>
          <span>👤 Активни регистрирани потребители / ден</span>
        </div>
      </div>

      {/* Статистика за целия период */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Общо посещения (за целия период)</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{allTimeVisits.toLocaleString("bg-BG")}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Уникални посетители (общо)</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--navy)" }}>{allTimeVisitors.size.toLocaleString("bg-BG")}</div>
        </div>
        <div className="glass kpi-card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Активни регистрирани (общо)</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, color: "var(--emerald-dark)" }}>{allTimeUsers.size.toLocaleString("bg-BG")}</div>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 16px" }}>Посещения по месеци — за целия период</h3>
        {months.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Все още няма натрупани данни.</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150, overflowX: "auto", paddingBottom: 4 }}>
              {months.map((m, i) => (
                <div key={i} style={{ minWidth: 38, flex: "1 0 38px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }} className="num">{m.visits}</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 90 }}>
                    <div title={`${m.label}: ${m.visits} посещения · ${m.visitorSet.size} уникални · ${m.userSet.size} активни регистрирани`}
                      style={{ height: `${(m.visits / maxMonthVisits) * 100}%`, minHeight: 3, background: i === months.length - 1 ? "var(--emerald)" : "var(--navy)", borderRadius: "4px 4px 0 0" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{m.label}</div>
                  <div style={{ fontSize: 9.5, color: "var(--emerald-dark)", fontWeight: 600 }} className="num">{m.userSet.size}👤</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11.5, color: "var(--muted)" }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--navy)", borderRadius: 2, marginRight: 5 }} />Посещения / месец</span>
              <span>👤 Активни регистрирани потребители / месец</span>
            </div>
          </>
        )}
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
