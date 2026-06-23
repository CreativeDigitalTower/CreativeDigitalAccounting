import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

const STATUS: Record<string, string> = { active: "Активен", completed: "Завършен", on_hold: "Пауза", cancelled: "Анулиран" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("projects");
  const { id } = await params;
  const p = await prisma.project.findFirst({ where: { id, companyId }, include: { client: true, entries: true } });
  if (!p) notFound();

  const revenue = p.entries.filter((e) => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const expense = p.entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Link href="/dashboard/projects" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Проекти</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{p.name}</h1>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 20, padding: "3px 10px" }}>{STATUS[p.status]}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { l: "Клиент", v: p.client?.name ?? "—" },
          { l: "Бюджет", v: p.budget != null ? formatCurrency(p.budget) : "—" },
          { l: "Приходи", v: formatCurrency(revenue) },
          { l: "Разходи", v: formatCurrency(expense) },
          { l: "Печалба", v: formatCurrency(revenue - expense) },
          { l: "Прогрес", v: `${p.progressPercent}%` },
          { l: "Срок", v: p.deadline ? new Date(p.deadline).toLocaleDateString("bg-BG") : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Прогрес</h3>
        <div style={{ height: 8, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p.progressPercent}%`, background: "var(--emerald)", borderRadius: 4 }} />
        </div>
      </div>
    </>
  );
}
