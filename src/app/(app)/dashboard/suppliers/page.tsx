import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UiIcon } from "@/components/app/NavIcons";
import { SupplierRowActions } from "@/components/app/SupplierRowActions";

export default async function SuppliersPage() {
  const { companyId } = await requireCompany();

  const suppliers = await prisma.supplier.findMany({
    where: { companyId },
    include: { _count: { select: { expenses: true, contracts: true } } },
    orderBy: { name: "asc" },
  });

  function Stars({ n }: { n: number | null }) {
    if (!n) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
    return (
      <span style={{ display: "inline-flex", gap: 1, color: "var(--brass)" }}>
        {Array.from({ length: 5 }, (_, i) => (
          i < n ? <UiIcon.starFill key={i} width={13} height={13} /> : <UiIcon.star key={i} width={13} height={13} />
        ))}
      </span>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Доставчици</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{suppliers.length} доставчика</div>
        </div>
        <Link href="/dashboard/suppliers/new" className="btn btn-primary">+ Нов доставчик</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {suppliers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><UiIcon.truck width={34} height={34} /></div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма доставчици</div>
            <Link href="/dashboard/suppliers/new" className="btn btn-primary btn-sm">Добави доставчик</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Доставчик</th>
                <th>ЕИК</th>
                <th>Имейл</th>
                <th>Телефон</th>
                <th className="num">Разходи</th>
                <th className="num">Договори</th>
                <th>Рейтинг</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--brass-soft)", color: "var(--brass)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                    </div>
                  </td>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12.5 }}>{s.eik ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{s.contactEmail ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{s.phone ?? "—"}</td>
                  <td className="num">{s._count.expenses}</td>
                  <td className="num">{s._count.contracts}</td>
                  <td><Stars n={s.rating} /></td>
                  <td><SupplierRowActions id={s.id} name={s.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
