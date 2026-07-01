import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AssetDetail } from "@/components/app/AssetDetail";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("assets");
  const { id } = await params;
  const a = await prisma.asset.findFirst({ where: { id, companyId }, include: { serviceLogs: { orderBy: { date: "desc" } } } });
  if (!a) notFound();

  return (
    <AssetDetail asset={{
      id: a.id, name: a.name, category: a.category, acquiredDate: a.acquiredDate.toISOString(),
      value: a.value, annualDepreciation: a.annualDepreciation, bookValue: a.bookValue,
      warrantyUntil: a.warrantyUntil?.toISOString() ?? null, insuranceUntil: a.insuranceUntil?.toISOString() ?? null,
      status: a.status, notes: a.notes,
    }}>
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Сервизен дневник ({a.serviceLogs.length})</h3>
        {a.serviceLogs.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Няма записи.</div> :
          a.serviceLogs.map((s) => (
            <div key={s.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.5)" }}>
              <strong>{new Date(s.date).toLocaleDateString("bg-BG")}</strong> — {s.description}
            </div>
          ))}
      </div>
    </AssetDetail>
  );
}
