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
