import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export default async function AssetsPage() {
  const { companyId } = await requireFeature("assets");
  const { t, locale } = await getT();
  const catLabel = (v: string) => { const l = t(`assets.categories.${v}`); return l.startsWith("assets.") ? v : l; };

  const assets = await prisma.asset.findMany({
    where: { companyId },
    orderBy: { acquiredDate: "desc" },
  });

  const totalValue = assets.reduce((s, a) => s + a.bookValue, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("assets.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {t("assets.count", { n: assets.length })} · {t("assets.bookValueLabel")} <strong className="num">{formatCurrency(totalValue)}</strong>
          </div>
        </div>
        <Link href="/dashboard/assets/new" className="btn btn-primary">{t("assets.newAsset")}</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {assets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V9l6 4V9l6 4V6l3 2v12H3Z"/><path d="M6.5 20v-3M12 20v-3M17 20v-3"/></svg></div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>{t("assets.empty")}</div>
            <Link href="/dashboard/assets/new" className="btn btn-primary btn-sm">{t("assets.add")}</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("assets.th.name")}</th>
                <th>{t("assets.th.category")}</th>
                <th>{t("assets.th.acquired")}</th>
                <th className="num">{t("assets.th.value")}</th>
                <th className="num">{t("assets.th.depreciation")}</th>
                <th className="num">{t("assets.th.bookValue")}</th>
                <th>{t("assets.th.warranty")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const warrantyExpired = a.warrantyUntil && new Date(a.warrantyUntil) < new Date();
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td style={{ fontSize: 13 }}>
                      <span style={{ background: "var(--navy-soft)", color: "var(--navy)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                        {catLabel(a.category)}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {new Date(a.acquiredDate).toLocaleDateString(locale)}
                    </td>
                    <td className="num">{formatCurrency(a.value)}</td>
                    <td className="num" style={{ color: "var(--brick)", fontSize: 13 }}>
                      -{formatCurrency(a.annualDepreciation)}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(a.bookValue)}</td>
                    <td style={{ fontSize: 12, color: warrantyExpired ? "var(--brick)" : "var(--emerald)" }}>
                      {a.warrantyUntil
                        ? `${warrantyExpired ? t("assets.warrantyExpired") : ""}${new Date(a.warrantyUntil).toLocaleDateString(locale)}`
                        : "—"}
                    </td>
                    <td>
                      <Link href={`/dashboard/assets/${a.id}`} className="btn btn-ghost btn-sm">{t("assets.details")}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
