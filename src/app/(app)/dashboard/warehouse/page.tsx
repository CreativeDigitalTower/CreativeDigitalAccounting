import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature, formatCurrency } from "@/lib/constants";
import { CategoriesManager } from "@/components/app/CategoriesManager";
import { FeatureLink } from "@/components/app/FeatureLink";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { WarehousePriceSimulator } from "@/components/app/WarehousePriceSimulator";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function WarehousePage() {
  const { companyId } = await requireCompany();
  const { t, locale } = await getT();
  const plan = await getPlan(companyId);
  const extended = planHasFeature(plan, "production"); // Бизнес + Про

  const [stockItems, warehouses, categories] = await Promise.all([
    prisma.stockItem.findMany({
      where: { companyId },
      include: { warehouse: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { companyId },
      include: { _count: { select: { stockItems: true } } },
    }),
    prisma.stockCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  const lowStock = stockItems.filter((i) => i.minQuantity !== null && i.quantity <= (i.minQuantity ?? 0));

  // Срок на годност — статус (жълто ≤7 дни, червено изтекъл)
  const now = new Date(); now.setHours(0, 0, 0, 0);
  function expiryStatus(exp: Date | null): { label: string; color: string; days: number } | null {
    if (!exp) return null;
    const d = new Date(exp); d.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - now.getTime()) / 86400000);
    if (days < 0) return { label: t("warehouse.page.expired", { d: -days }), color: "var(--brick)", days };
    if (days <= 7) return { label: t("warehouse.page.expiryIn", { d: days }), color: "var(--brass)", days };
    return { label: d.toLocaleDateString(locale), color: "var(--ink-soft)", days };
  }
  const expiringItems = stockItems.map((i) => ({ i, s: expiryStatus(i.expiryDate) })).filter((x) => x.s && x.s.days <= 7);

  // Обща стойност на наличността (количество × ед. цена)
  const itemValue = (i: { quantity: number; unitCost: number | null }) => i.quantity * (i.unitCost ?? 0);
  const totalStockValue = stockItems.reduce((s, i) => s + itemValue(i), 0);
  const valueByWarehouse = new Map<string, number>();
  for (const i of stockItems) valueByWarehouse.set(i.warehouseId, (valueByWarehouse.get(i.warehouseId) ?? 0) + itemValue(i));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("warehouse.page.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("warehouse.page.subtitle", { items: stockItems.length, wh: warehouses.length })}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/warehouse/receive" className="btn btn-ghost">{t("warehouse.page.btn.receive")}</Link>
          <Link href="/dashboard/warehouse/issue" className="btn btn-ghost">{t("warehouse.page.btn.issue")}</Link>
          <FeatureLink plan={plan} feature="revision" href="/dashboard/warehouse/scrap">{t("warehouse.page.btn.scrap")}</FeatureLink>
          <FeatureLink plan={plan} feature="revision" href="/dashboard/warehouse/revision">{t("warehouse.page.btn.revision")}</FeatureLink>
          <Link href="/dashboard/warehouse/items/new" className="btn btn-primary">{t("warehouse.page.btn.newItem")}</Link>
        </div>
      </div>

      {extended && <CategoriesManager initial={categories.map((c) => ({ id: c.id, name: c.name }))} />}

      {/* Обща стойност на склада */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "linear-gradient(135deg, rgba(15,138,106,.08), rgba(11,94,74,.04))" }}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("warehouse.page.totalTitle")}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t("warehouse.page.totalHint")}</div>
        </div>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, color: "var(--emerald-dark)" }}>{formatCurrency(totalStockValue)}</div>
      </div>

      {/* Warehouses overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {warehouses.map((w) => (
          <div key={w.id} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><NavIcon.warehouse width={14} height={14} /> {w.name}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{w._count.stockItems}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{t("warehouse.page.whUnit")} · <strong style={{ color: "var(--emerald-dark)" }}>{formatCurrency(valueByWarehouse.get(w.id) ?? 0)}</strong></div>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid rgba(162,59,43,.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
          <strong style={{ color: "var(--brick)", display: "inline-flex", alignItems: "center", gap: 6 }}><UiIcon.warning width={14} height={14} /> {t("warehouse.page.lowStock", { n: lowStock.length })}</strong>{" "}
          {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}

      {/* Изтичащ срок на годност */}
      {expiringItems.length > 0 && (
        <div style={{ background: "var(--brass-soft)", border: "1px solid rgba(165,129,46,.35)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
          <strong style={{ color: "var(--brass)" }}>{t("warehouse.page.expiryTitle")}</strong>{" "}
          {expiringItems.map(({ i, s }) => <span key={i.id} style={{ color: s!.color, fontWeight: 600, marginRight: 10 }}>{i.name} — {s!.label}</span>)}
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {stockItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><NavIcon.warehouse width={34} height={34} /></div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>{t("warehouse.page.empty")}</div>
            <Link href="/dashboard/warehouse/items/new" className="btn btn-primary btn-sm">{t("warehouse.page.add")}</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("warehouse.page.th.item")}</th>
                <th>{t("warehouse.page.th.sku")}</th>
                {extended && <th>{t("warehouse.page.th.category")}</th>}
                <th>{t("warehouse.page.th.warehouse")}</th>
                <th>{t("warehouse.page.th.unit")}</th>
                <th className="num">{t("warehouse.page.th.qty")}</th>
                <th className="num">{t("warehouse.page.th.minQty")}</th>
                <th className="num">{t("warehouse.page.th.price")}</th>
                <th className="num">{t("warehouse.page.th.value")}</th>
                <th>{t("warehouse.page.th.expiry")}</th>
                <th>{t("warehouse.page.th.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item) => {
                const isLow = item.minQuantity !== null && item.quantity <= (item.minQuantity ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{item.sku ?? "—"}</td>
                    {extended && <td style={{ fontSize: 12.5 }}>{item.category?.name ?? "—"}</td>}
                    <td style={{ fontSize: 13 }}>{item.warehouse.name}</td>
                    <td style={{ fontSize: 13 }}>{item.unit}</td>
                    <td className="num" style={{ fontWeight: 600, color: isLow ? "var(--brick)" : "inherit" }}>
                      {item.quantity}
                    </td>
                    <td className="num" style={{ color: "var(--muted)", fontSize: 12.5 }}>
                      {item.minQuantity ?? "—"}
                    </td>
                    <td className="num" style={{ fontSize: 13 }}>
                      {item.unitCost != null ? `${item.unitCost.toFixed(2)} EUR` : "—"}
                    </td>
                    <td className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--emerald-dark)" }}>
                      {item.unitCost != null ? formatCurrency(itemValue(item)) : "—"}
                    </td>
                    <td>{(() => { const s = expiryStatus(item.expiryDate); return s
                      ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: s.color, borderRadius: 12, padding: "2px 9px" }}>{s.label}</span>
                      : <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("warehouse.page.noExpiry")}</span>; })()}</td>
                    <td>
                      {isLow ? (
                        <span style={{ color: "var(--brick)", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><UiIcon.warning width={12} height={12} /> {t("warehouse.page.statusLow")}</span>
                      ) : (
                        <span style={{ color: "var(--emerald)", fontSize: 12, fontWeight: 600 }}>{t("warehouse.page.statusOk")}</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/warehouse/items/${item.id}`} className="btn btn-ghost btn-sm">
                        {t("warehouse.page.details")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={extended ? 8 : 7} style={{ textAlign: "right" }}>{t("warehouse.page.footTotal")}</td>
                <td className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(totalStockValue)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Симулация на промяна на цените — само за платени планове */}
      {plan !== "free" && (() => {
        const priced = stockItems.filter((i) => (i.unitCost ?? 0) > 0);
        const avgUnit = priced.length ? priced.reduce((s, i) => s + (i.unitCost ?? 0), 0) / priced.length : 0;
        return <WarehousePriceSimulator totalValue={totalStockValue} itemCount={stockItems.length} avgUnit={avgUnit} />;
      })()}
    </>
  );
}
