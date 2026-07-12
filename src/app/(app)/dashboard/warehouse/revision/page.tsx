import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RevisionForm } from "@/components/app/RevisionForm";
import { getT } from "@/lib/i18n/server";

export default async function RevisionPage() {
  const { companyId } = await requireFeature("revision");
  const { t, locale } = await getT();
  const rows = await prisma.stockItem.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  const items = rows.map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity }));
  const warehouses = await prisma.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  // ─── Архив с ревизии (протоколи) ───
  const stocktakes = await prisma.stocktake.findMany({
    where: { companyId }, include: { lines: true }, orderBy: { createdAt: "desc" }, take: 50,
  });
  const userIds = [...new Set(stocktakes.map((s) => s.userId).filter(Boolean) as string[])];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const userName = (id: string | null) => { const u = users.find((x) => x.id === id); return u ? (u.name || u.email) : "—"; };

  return (
    <>
      <RevisionForm items={items} warehouses={warehouses} />

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>{t("warehouse.revision.archiveTitle", { n: stocktakes.length })}</h2>
        {stocktakes.length === 0 ? (
          <div className="glass panel" style={{ fontSize: 13, color: "var(--muted)", padding: "20px" }}>{t("warehouse.revision.archiveEmpty")}</div>
        ) : stocktakes.map((s) => {
          const changed = s.lines.filter((l) => l.countedQty !== l.previousQty).length;
          const dt = new Date(s.createdAt);
          return (
            <details key={s.id} className="glass panel" style={{ marginBottom: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span>
                  <strong>{dt.toLocaleDateString(locale)}</strong> {t("warehouse.revision.at")} {dt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12.5 }}>· {t("warehouse.revision.metaBy", { user: userName(s.userId) })}</span>
                  {s.note && <span style={{ color: "var(--ink-soft)", marginLeft: 8, fontSize: 12.5 }}>· {s.note}</span>}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("warehouse.revision.metaCount", { n: s.lines.length, c: changed })}</span>
              </summary>
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>{t("warehouse.revision.protoTh.item")}</th><th className="num">{t("warehouse.revision.protoTh.before")}</th><th className="num">{t("warehouse.revision.protoTh.counted")}</th><th className="num">{t("warehouse.revision.protoTh.diff")}</th></tr></thead>
                <tbody>
                  {s.lines.map((l) => {
                    const diff = l.countedQty - l.previousQty;
                    return (
                      <tr key={l.id}>
                        <td>{l.itemName}</td>
                        <td className="num">{l.previousQty}</td>
                        <td className="num">{l.countedQty}</td>
                        <td className="num" style={{ fontWeight: 700, color: diff === 0 ? "var(--muted)" : diff > 0 ? "var(--emerald-dark)" : "var(--brick)" }}>
                          {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${diff}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
          );
        })}
      </div>
    </>
  );
}
