import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";

// Phase 1: входна точка на модула. Guard-ът пренасочва фирми без достъп към /dashboard,
// така модулът НЕ се вижда от други клиенти. Бизнес екраните идват в следващите фази.
export default async function LogisticsDashboardPage() {
  const { companyId } = await requireLogistics();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, companyGroup: { select: { name: true, companies: { select: { id: true, name: true, eik: true, defaultCurrency: true } } } } },
  });

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Търговия, доставки и логистика</h1>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
        Модулът е активиран за тази фирма. Основата (бизнес група, достъп, номерация) е готова.
        Оперативните екрани — курсове, експедиции, Holcim фактури, внос, BG→MK продажби — предстоят
        в следващите фази.
      </p>

      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Бизнес група</h3>
        {company?.companyGroup ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>{company.companyGroup.name}</strong></div>
            {company.companyGroup.companies.map((c) => (
              <div key={c.id} style={{ fontSize: 13, padding: "6px 0", borderTop: "1px solid rgba(217,215,200,.5)" }}>
                {c.name} {c.eik ? `· ЕИК ${c.eik}` : ""} · {c.defaultCurrency}
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Фирмата все още не е присъединена към бизнес група.</div>
        )}
      </div>
    </div>
  );
}
