import Link from "next/link";
import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { DEFAULT_SHIPMENT_STATUS } from "@/lib/logistics/config";

// Phase 2: входно табло на модула — master data (автомобили/продукти/превозвачи/маршрути).
// Оперативните курсове идват в следващите фази.
export default async function LogisticsDashboardPage() {
  const { companyId } = await requireLogistics();
  const { t } = await getT();
  const [shipments, awaiting, vehicles, products, carriers, routes, company] = await Promise.all([
    prisma.shipment.count({ where: { companyId, deletedAt: null } }),
    prisma.shipment.count({ where: { companyId, deletedAt: null, status: DEFAULT_SHIPMENT_STATUS } }),
    prisma.vehicle.count({ where: { companyId, normalizedRegistration: { not: null } } }),
    prisma.logisticsProduct.count({ where: { companyId } }),
    prisma.carrier.count({ where: { companyId } }),
    prisma.logisticsRoute.count({ where: { companyId } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { companyGroup: { select: { name: true, companies: { select: { id: true, name: true, eik: true, defaultCurrency: true } } } } } }),
  ]);

  const cards = [
    { label: t("logistics.shipments.title"), n: shipments, href: "/dashboard/logistics/shipments" },
    { label: t("logistics.shipmentStatus.loaded"), n: awaiting, href: "/dashboard/logistics/shipments" },
    { label: t("logistics.dashboard.vehicles"), n: vehicles, href: "/dashboard/logistics/vehicles" },
    { label: t("logistics.dashboard.products"), n: products, href: "/dashboard/logistics/products" },
    { label: t("logistics.dashboard.carriers"), n: carriers, href: "/dashboard/logistics/carriers" },
    { label: t("logistics.dashboard.routes"), n: routes, href: "/dashboard/logistics/routes" },
  ];

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.dashboard.title")}</h1>
        <Link href="/dashboard/logistics/shipments/new" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>{t("logistics.shipments.add")}</Link>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>{t("logistics.dashboard.intro")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 20 }}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="glass kpi-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{c.label}</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{c.n}</div>
          </Link>
        ))}
      </div>

      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("logistics.dashboard.group")}</h3>
        {company?.companyGroup ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>{company.companyGroup.name}</strong></div>
            {company.companyGroup.companies.map((c) => (
              <div key={c.id} style={{ fontSize: 13, padding: "6px 0", borderTop: "1px solid rgba(217,215,200,.5)" }}>
                {c.name} {c.eik ? `· ЕИК ${c.eik}` : ""} · {c.defaultCurrency}
              </div>
            ))}
          </>
        ) : <div style={{ fontSize: 13, color: "var(--muted)" }}>—</div>}
      </div>
    </div>
  );
}
