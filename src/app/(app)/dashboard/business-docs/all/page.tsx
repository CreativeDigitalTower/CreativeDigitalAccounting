import { requireCompany, getPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/constants";
import Link from "next/link";
import { getCategory } from "@/lib/businessDocs/templates";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";

const STATUS_LABEL: Record<string, string> = { draft: "Чернова", final: "Завършен", archived: "Архивиран" };
const STATUS_COLOR: Record<string, string> = { draft: "var(--brass)", final: "var(--emerald)", archived: "var(--muted)" };

export default async function AllBusinessDocsPage() {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const docs = await prisma.businessDocument.findMany({
    where: { companyId },
    select: { id: true, title: true, category: true, status: true, favorite: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href="/dashboard/business-docs" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Бизнес документи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Моите документи</h1>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗎</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Все още нямате генерирани документи</div>
            <Link href="/dashboard/business-docs" className="btn btn-primary btn-sm">Разгледай шаблоните</Link>
          </div>
        ) : (
          <table>
            <thead><tr><th>Документ</th><th>Категория</th><th>Статус</th><th>Обновен</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.favorite ? "⭐ " : ""}{d.title}</td>
                  <td style={{ fontSize: 13 }}>{getCategory(d.category)?.title ?? d.category}</td>
                  <td><span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[d.status] }}>{STATUS_LABEL[d.status]}</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(d.updatedAt).toLocaleDateString("bg-BG")}</td>
                  <td><Link href={`/dashboard/business-docs/doc/${d.id}`} className="btn btn-ghost btn-sm">Отвори</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
