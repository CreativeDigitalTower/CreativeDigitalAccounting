import Link from "next/link";
import { requireCompany } from "@/lib/session";
import { getMyCompanies } from "@/lib/myCompanies";
import { getT } from "@/lib/i18n/server";
import { fmtMoney } from "@/lib/i18n/format";
import { OverviewEnter } from "@/components/app/OverviewEnter";

// „Обобщен изглед" — управленски dashboard над всички собствени фирми на потребителя.
// Обобщава реални per-company данни (изолацията остава непокътната).
export default async function OverviewPage() {
  const { userId } = await requireCompany();
  const { t, locale } = await getT();
  const companies = await getMyCompanies(userId);

  const totals = companies.reduce((a, c) => {
    a.revenue += c.monthRevenue; a.receivables += c.receivables; a.overdue += c.overdueCount;
    a.documents += c.documents; a.clients += c.clients;
    return a;
  }, { revenue: 0, receivables: 0, overdue: 0, documents: 0, clients: 0 });
  const maxRevenue = Math.max(1, ...companies.map((c) => c.monthRevenue));

  const kpis = [
    { label: t("overview.kpi.revenue"), value: fmtMoney(totals.revenue, locale, "EUR"), color: "var(--navy)" },
    { label: t("overview.kpi.receivables"), value: fmtMoney(totals.receivables, locale, "EUR"), color: "var(--brass)" },
    { label: t("overview.kpi.overdue"), value: String(totals.overdue), color: "var(--brick)" },
    { label: t("overview.kpi.documents"), value: String(totals.documents), color: "var(--ink)" },
    { label: t("overview.kpi.clients"), value: String(totals.clients), color: "var(--emerald-dark)" },
    { label: t("overview.kpi.companies"), value: String(companies.length), color: "var(--navy)" },
  ];

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("overview.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("overview.subtitle", { n: companies.length })}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{k.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Оборот по фирми (разпределение) */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 22 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("overview.revenueByCompany")}</h3>
        {companies.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("overview.empty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {companies.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 150, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                <div style={{ flex: 1, height: 10, background: "var(--brass-soft)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((c.monthRevenue / maxRevenue) * 100)}%`, background: "var(--brass)" }} />
                </div>
                <span className="num" style={{ width: 100, textAlign: "right", fontSize: 12.5 }}>{fmtMoney(c.monthRevenue, locale, "EUR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Таблица по фирми */}
      <div className="glass panel bi-table" style={{ padding: "8px 0", overflowX: "auto" }}>
        <table>
          <thead><tr>
            <th>{t("overview.th.company")}</th><th className="num">{t("overview.th.revenue")}</th><th className="num">{t("overview.th.receivables")}</th>
            <th className="num">{t("overview.th.overdue")}</th><th className="num">{t("overview.th.documents")}</th><th className="num">{t("overview.th.clients")}</th><th></th>
          </tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}<span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{c.eik ?? "—"}</span></td>
                <td className="num">{fmtMoney(c.monthRevenue, locale, "EUR")}</td>
                <td className="num">{fmtMoney(c.receivables, locale, "EUR")}</td>
                <td className="num" style={{ color: c.overdueCount ? "var(--brick)" : "inherit" }}>{c.overdueCount}</td>
                <td className="num">{c.documents}</td>
                <td className="num">{c.clients}</td>
                <td style={{ textAlign: "right" }}><OverviewEnter companyId={c.id} label={t("overview.open")} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>
        <Link href="/dashboard/companies" style={{ color: "var(--brass)" }}>{t("myCompanies.title")}</Link>
      </p>
    </>
  );
}
