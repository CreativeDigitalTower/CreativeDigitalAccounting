import Link from "next/link";
import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { fmtMoney } from "@/lib/i18n/format";
import { isPayingSubscriber } from "@/lib/billing";
import { planPrice } from "@/lib/constants";

// Super Admin: групи фирми по общ собственик („Моите фирми"). Показва кой потребител
// управлява кои самостоятелни фирми + общ MRR/ARR на групата. Само за преглед.
export default async function CompanyGroupsPage() {
  await requireSuperAdmin();
  const { t, locale } = await getT();

  // Всички собственически връзки към самостоятелни фирми (не счет. къщи/клиенти).
  const owners = await prisma.companyUser.findMany({
    where: { role: "owner", company: { isAccountingFirm: false, managedByFirmId: null, archivedAt: null } },
    select: {
      user: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true, eik: true, subscription: { select: { plan: true, status: true, paymentStatus: true, billingMode: true, discountPercent: true } } } },
    },
  });

  // Групиране по потребител.
  type Row = { plan: string; mrr: number; id: string; name: string; eik: string | null; discount: number | null };
  const groups = new Map<string, { user: { id: string; name: string | null; email: string }; companies: Row[] }>();
  for (const o of owners) {
    const g = groups.get(o.user.id) ?? { user: o.user, companies: [] };
    const paying = isPayingSubscriber(o.company.subscription);
    const base = paying ? planPrice((o.company.subscription?.plan ?? "free") as never) : 0;
    const disc = o.company.subscription?.discountPercent ?? 0;
    const mrr = +(base * (1 - disc / 100)).toFixed(2);
    g.companies.push({ id: o.company.id, name: o.company.name, eik: o.company.eik, plan: o.company.subscription?.plan ?? "free", mrr, discount: o.company.subscription?.discountPercent ?? null });
    groups.set(o.user.id, g);
  }
  // Само групи с поне 2 фирми (истинските мулти-фирмени собственици) + сортиране по брой.
  const list = [...groups.values()].filter((g) => g.companies.length >= 2)
    .sort((a, b) => b.companies.length - a.companies.length);

  const grandMrr = list.reduce((s, g) => s + g.companies.reduce((x, c) => x + c.mrr, 0), 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "0 0 3px" }}>{t("companyGroups.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{t("companyGroups.subtitle", { n: list.length })}</div>
        </div>
        <Link href="/dashboard/admin" className="btn btn-ghost btn-sm">{t("companyGroups.backAdmin")}</Link>
      </div>

      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("companyGroups.grandMrr")}: </span>
        <strong className="num">{fmtMoney(grandMrr, locale, "EUR")}</strong>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 14 }}>{t("companyGroups.grandArr")}: </span>
        <strong className="num">{fmtMoney(grandMrr * 12, locale, "EUR")}</strong>
      </div>

      {list.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>{t("companyGroups.empty")}</div>
      ) : list.map((g) => {
        const mrr = g.companies.reduce((s, c) => s + c.mrr, 0);
        return (
          <div key={g.user.id} className="glass panel" style={{ padding: "14px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{g.user.name ?? "—"} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12.5 }}>({g.user.email})</span></div>
              <div style={{ fontSize: 12.5 }}>{t("companyGroups.companies", { n: g.companies.length })} · MRR <strong className="num">{fmtMoney(mrr, locale, "EUR")}</strong></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.companies.map((c) => (
                <div key={c.id} style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 6 }}>{c.eik ?? "—"}</span>
                  <span style={{ marginLeft: 8, color: "var(--navy)" }}>{t(`pricing.plans.${c.plan}.name`)}</span>
                  {c.discount ? <span style={{ marginLeft: 6, color: "var(--emerald-dark)" }}>−{c.discount}%</span> : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("companyGroups.note")}</p>
    </>
  );
}
