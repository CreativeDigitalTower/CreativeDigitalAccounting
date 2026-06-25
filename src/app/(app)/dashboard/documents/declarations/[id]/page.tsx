import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { PLATFORM_CREDIT } from "@/lib/constants";

export default async function DeclarationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("declarations");
  const { id } = await params;
  const [d, company] = await Promise.all([
    prisma.conformityDeclaration.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!d) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }} className="no-print">
        <Link href="/dashboard/documents/declarations" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Декларации</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{d.number}</h1>
        <div style={{ marginLeft: "auto" }}><DownloadButtons filename={d.number} /></div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, padding: "40px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700 }}>ДЕКЛАРАЦИЯ ЗА СЪОТВЕТСТВИЕ</div>
          <div className="num" style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>№ {d.number} · {new Date(d.date).toLocaleDateString("bg-BG")}</div>
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 18 }}>
          <div><strong>Производител/Издател:</strong> {company?.name}{company?.eik ? `, ЕИК ${company.eik}` : ""}</div>
          {company?.address && <div><strong>Адрес:</strong> {company.address}{company?.city ? `, ${company.city}` : ""}</div>}
          {d.issuedFor && <div><strong>Издадена за:</strong> {d.issuedFor}</div>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, fontSize: 13.5, lineHeight: 1.8 }}>
          <div><strong>Продукт:</strong> {d.productName}</div>
          {d.batchNumber && <div><strong>Партиден номер:</strong> {d.batchNumber}</div>}
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.8, marginTop: 16 }}>
          {d.description || "С настоящата декларираме на своя отговорност, че горепосоченият продукт отговаря на приложимите нормативни и технически изисквания за безопасност и качество."}
        </p>

        {d.standards && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ПРИЛОЖИМИ СТАНДАРТИ И ИЗИСКВАНИЯ</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{d.standards}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 48 }}>
          <div style={{ textAlign: "center", minWidth: 220 }}>
            <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 6, fontSize: 12.5 }}>Подпис и печат: {d.signedBy ?? company?.mol ?? "................"}</div>
          </div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--muted)", textAlign: "center" }}>
          {PLATFORM_CREDIT}
        </div>
      </div>
    </>
  );
}
