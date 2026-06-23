import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("assets");
  const { id } = await params;
  const a = await prisma.asset.findFirst({ where: { id, companyId }, include: { serviceLogs: { orderBy: { date: "desc" } } } });
  if (!a) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Link href="/dashboard/assets" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Активи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{a.name}</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: "Категория", v: a.category },
          { l: "Придобит", v: new Date(a.acquiredDate).toLocaleDateString("bg-BG") },
          { l: "Стойност", v: formatCurrency(a.value) },
          { l: "Год. амортизация", v: formatCurrency(a.annualDepreciation) },
          { l: "Балансова стойност", v: formatCurrency(a.bookValue) },
          { l: "Гаранция до", v: a.warrantyUntil ? new Date(a.warrantyUntil).toLocaleDateString("bg-BG") : "—" },
          { l: "Застраховка до", v: a.insuranceUntil ? new Date(a.insuranceUntil).toLocaleDateString("bg-BG") : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Сервизен дневник ({a.serviceLogs.length})</h3>
        {a.serviceLogs.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма записи.</div> :
          a.serviceLogs.map((s) => (
            <div key={s.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.5)" }}>
              <strong>{new Date(s.date).toLocaleDateString("bg-BG")}</strong> — {s.description}
            </div>
          ))}
      </div>
    </>
  );
}
