import Link from "next/link";
import { requireLogistics } from "@/lib/logistics/access";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { shipmentDelayed } from "@/lib/logistics/transport";
import { profitability } from "@/lib/logistics/analytics";
import { sumMoney } from "@/lib/logistics/money";

export default async function LogisticsDashboardPage() {
  const { companyId } = await requireLogistics();
  const { t } = await getT();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusGroups, activeMs, awaitingInvoice, missingCmr, loadedAgg, soldAgg, mkNet, bgmkIssuedNet, holcimNet, bgmkRecvNet, importCosts, vehicles, products, company] = await Promise.all([
    prisma.shipment.groupBy({ by: ["status"], where: { companyId, deletedAt: null }, _count: true }),
    prisma.shipment.findMany({ where: { companyId, deletedAt: null, status: { notIn: ["completed", "unloaded"] } }, select: { milestones: { select: { expectedFrom: true, expectedTo: true, actualAt: true } } }, take: 1000 }),
    prisma.shipment.count({ where: { companyId, deletedAt: null, invoiceLinks: { none: {} } } }),
    prisma.shipment.count({ where: { companyId, deletedAt: null, status: { notIn: ["planned", "at_factory", "loading", "completed"] }, documents: { none: { docType: "cmr", deletedAt: null } } } }),
    prisma.shipment.aggregate({ where: { companyId, deletedAt: null, dispatchDate: { gte: monthStart } }, _sum: { netQuantity: true } }),
    prisma.mkInvoiceLine.aggregate({ where: { invoice: { companyId, date: { gte: monthStart } } }, _sum: { quantity: true } }),
    prisma.mkInvoiceLine.aggregate({ where: { invoice: { companyId } }, _sum: { lineTotal: true } }),
    prisma.bgMkInvoiceLine.aggregate({ where: { invoice: { companyId } }, _sum: { lineTotal: true } }),
    prisma.supplierInvoiceShipmentLink.aggregate({ where: { invoice: { companyId } }, _sum: { lineTotal: true } }),
    prisma.bgMkInvoiceLine.aggregate({ where: { invoice: { counterpartyCompanyId: companyId } }, _sum: { lineTotal: true } }),
    prisma.importCost.aggregate({ where: { shipment: { companyId }, includeInCost: true }, _sum: { baseAmount: true } }),
    prisma.vehicle.count({ where: { companyId, normalizedRegistration: { not: null } } }),
    prisma.logisticsProduct.count({ where: { companyId } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { companyGroup: { select: { name: true, companies: { select: { id: true, name: true, eik: true, defaultCurrency: true } } } } } }),
  ]);

  // §25 — получени BG→MK доставки без издадена MK фактура (за да не се пропусне доставка).
  const myGroupId = await prisma.company.findUnique({ where: { id: companyId }, select: { companyGroupId: true } });
  const uninvoicedReceived = myGroupId?.companyGroupId
    ? await prisma.exportDocumentSet.count({
        where: { buyerCompanyId: companyId, company: { companyGroupId: myGroupId.companyGroupId }, mkInvoices: { none: {} } },
      })
    : 0;

  const stCount = (s: string) => statusGroups.find((x) => x.status === s)?._count ?? 0;
  const delayed = activeMs.filter((s) => shipmentDelayed(s.milestones)).length;
  const sales = sumMoney([mkNet._sum.lineTotal ?? 0, bgmkIssuedNet._sum.lineTotal ?? 0]);
  const purchases = sumMoney([holcimNet._sum.lineTotal ?? 0, bgmkRecvNet._sum.lineTotal ?? 0]);
  const profit = profitability(purchases, importCosts._sum.baseAmount ?? 0, sales);

  const KpiGroup = ({ title, items }: { title: string; items: { l: string; v: React.ReactNode }[] }) => (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 8px" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 10 }}>
        {items.map((k) => (
          <div key={k.l}><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{k.l}</div><div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{k.v}</div></div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.dashboard.title")}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/dashboard/logistics/analytics" className="btn btn-ghost btn-sm">{t("logistics.analytics.title")}</Link>
          <Link href="/dashboard/logistics/shipments/new" className="btn btn-primary btn-sm">{t("logistics.shipments.add")}</Link>
        </div>
      </div>

      {uninvoicedReceived > 0 && (
        <Link href="/dashboard/logistics/export-received" className="glass panel" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", marginBottom: 14, borderLeft: "3px solid var(--brick)" }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "var(--brick)" }}>{uninvoicedReceived}</span>
          <span style={{ fontSize: 13 }}>{t("logistics.received.dashWarn")} →</span>
        </Link>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginBottom: 16 }}>
        <KpiGroup title={t("logistics.dash.today")} items={[
          { l: t("logistics.shipmentStatus.loaded"), v: stCount("loaded") },
          { l: t("logistics.shipmentStatus.in_transit"), v: stCount("in_transit") },
          { l: t("logistics.shipmentStatus.at_border"), v: stCount("at_border") },
          { l: t("logistics.shipmentStatus.arrived"), v: stCount("arrived") },
          { l: t("logistics.transport.stDelayed"), v: <span style={{ color: delayed ? "var(--brick)" : "inherit" }}>{delayed}</span> },
        ]} />
        <KpiGroup title={t("logistics.dash.documents")} items={[
          { l: t("logistics.dash.awaitingInvoice"), v: awaitingInvoice },
          { l: t("logistics.dash.missingCmr"), v: <span style={{ color: missingCmr ? "var(--brass)" : "inherit" }}>{missingCmr}</span> },
        ]} />
        <KpiGroup title={t("logistics.dash.quantities")} items={[
          { l: t("logistics.dash.loadedMonth"), v: `${Math.round((loadedAgg._sum.netQuantity ?? 0) * 100) / 100} t` },
          { l: t("logistics.dash.soldMonth"), v: `${Math.round((soldAgg._sum.quantity ?? 0) * 100) / 100} t` },
        ]} />
        <KpiGroup title={t("logistics.dash.finances")} items={[
          { l: t("logistics.dash.purchases"), v: profit.purchase },
          { l: t("logistics.dash.sales"), v: profit.revenue },
          { l: t("logistics.dash.margin"), v: profit.marginPct != null ? `${profit.marginPct}%` : "—" },
        ]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: t("logistics.shipments.title"), n: statusGroups.reduce((s, x) => s + x._count, 0), href: "/dashboard/logistics/shipments" },
          { label: t("logistics.dashboard.vehicles"), n: vehicles, href: "/dashboard/logistics/vehicles" },
          { label: t("logistics.dashboard.products"), n: products, href: "/dashboard/logistics/products" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="glass kpi-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{c.label}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{c.n}</div>
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
