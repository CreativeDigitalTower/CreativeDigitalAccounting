import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { PLATFORM_CREDIT } from "@/lib/constants";

const SECTIONS: { key: string; label: string }[] = [
  { key: "purpose", label: "Предназначение" },
  { key: "classification", label: "Класификация" },
  { key: "ingredients", label: "Съставки" },
  { key: "rawMaterials", label: "Суровини" },
  { key: "packaging", label: "Опаковъчни и спомагателни материали" },
  { key: "preparation", label: "Подготовка на суровините" },
  { key: "process", label: "Описание на технологичния процес" },
  { key: "organoleptic", label: "Органолептични показатели" },
  { key: "physicochemical", label: "Физикохимични показатели" },
  { key: "microbiological", label: "Микробиологични показатели" },
  { key: "samplingMethods", label: "Методи за вземане на проби и анализ" },
  { key: "labeling", label: "Опаковане, етикетиране и маркировка" },
  { key: "productionControl", label: "Производствен контрол" },
  { key: "notes", label: "Допълнителни бележки" },
];

export default async function TdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("haccp");
  const { id } = await params;
  const [d, company] = await Promise.all([
    prisma.technologicalDoc.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!d) notFound();
  const doc = d as unknown as Record<string, string | null>;

  const bake = [d.bakingTemp && `Температура: ${d.bakingTemp}`, d.bakingTime && `Време: ${d.bakingTime}`, d.cooling && `Охлаждане: ${d.cooling}`].filter(Boolean).join(" · ");
  const store = [d.storage && `Температура: ${d.storage}`, d.shelfLife && `Срок: ${d.shelfLife}`, d.storageConditions, d.transport && `Транспорт: ${d.transport}`].filter(Boolean).join(" · ");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }} className="no-print">
        <Link href="/dashboard/haccp" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← HACCP</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>ТД — {d.productName}</h1>
        <div style={{ marginLeft: "auto" }}><DownloadButtons filename={`ТД-${d.productName}`} /></div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 820, padding: "40px 48px", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--ink)", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{company?.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{[company?.address, company?.city].filter(Boolean).join(", ")}{company?.eik ? ` · ЕИК ${company.eik}` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontWeight: 700 }}>{d.docNumber ?? ""}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Утвърждавам: Управител</div>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Fraunces', serif", textAlign: "center", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>ТЕХНОЛОГИЧНА ДОКУМЕНТАЦИЯ</h2>
        <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Наименование на готовата храна: {d.productName}</div>

        {bake && <div style={{ marginBottom: 12, fontSize: 12.5 }}><strong>Топлинна обработка:</strong> {bake}</div>}

        {SECTIONS.filter((s) => doc[s.key]).map((s) => (
          <div key={s.key} style={{ marginBottom: 14, breakInside: "avoid" }}>
            <div style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700, letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{doc[s.key]}</div>
          </div>
        ))}

        {store && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700, letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>Съхранение и транспорт</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{store}</div>
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
          {PLATFORM_CREDIT}
        </div>
      </div>
    </>
  );
}
