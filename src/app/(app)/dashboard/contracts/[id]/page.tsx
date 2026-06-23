import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const STATUS: Record<string, string> = { active: "Активен", expired: "Изтекъл", cancelled: "Анулиран" };

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("contracts");
  const { id } = await params;
  const c = await prisma.contract.findFirst({ where: { id, companyId }, include: { client: true, supplier: true } });
  if (!c) notFound();

  const party = c.counterpartyType === "client" ? c.client?.name : c.supplier?.name;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Link href="/dashboard/contracts" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Договори</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{c.title}</h1>
      </div>
      <div className="glass panel" style={{ maxWidth: 560 }}>
        <dl style={{ margin: 0, fontSize: 13.5, display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 14px" }}>
          {[
            ["Страна", `${c.counterpartyType === "client" ? "Клиент" : "Доставчик"}: ${party ?? "—"}`],
            ["Начало", new Date(c.startDate).toLocaleDateString("bg-BG")],
            ["Край", c.endDate ? new Date(c.endDate).toLocaleDateString("bg-BG") : "—"],
            ["Авт. подновяване", c.autoRenew ? "Да" : "Не"],
            ["Статус", STATUS[c.status]],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
