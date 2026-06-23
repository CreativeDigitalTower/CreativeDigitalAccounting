import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export default async function AssetsPage() {
  const { companyId } = await requireFeature("assets");

  const assets = await prisma.asset.findMany({
    where: { companyId },
    orderBy: { acquiredDate: "desc" },
  });

  const totalValue = assets.reduce((s, a) => s + a.bookValue, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Дълготрайни Активи</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {assets.length} актива · Балансова стойност: <strong className="num">{formatCurrency(totalValue)}</strong>
          </div>
        </div>
        <Link href="/dashboard/assets/new" className="btn btn-primary">+ Нов актив</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {assets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма регистрирани активи</div>
            <Link href="/dashboard/assets/new" className="btn btn-primary btn-sm">Добави актив</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Категория</th>
                <th>Придобит на</th>
                <th className="num">Придоб. стойност</th>
                <th className="num">Год. амортизация</th>
                <th className="num">Балансова стойност</th>
                <th>Гаранция</th>
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
                        {a.category}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {new Date(a.acquiredDate).toLocaleDateString("bg-BG")}
                    </td>
                    <td className="num">{formatCurrency(a.value)}</td>
                    <td className="num" style={{ color: "var(--brick)", fontSize: 13 }}>
                      -{formatCurrency(a.annualDepreciation)}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(a.bookValue)}</td>
                    <td style={{ fontSize: 12, color: warrantyExpired ? "var(--brick)" : "var(--emerald)" }}>
                      {a.warrantyUntil
                        ? `${warrantyExpired ? "Изтекла " : ""}${new Date(a.warrantyUntil).toLocaleDateString("bg-BG")}`
                        : "—"}
                    </td>
                    <td>
                      <Link href={`/dashboard/assets/${a.id}`} className="btn btn-ghost btn-sm">Детайли</Link>
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
