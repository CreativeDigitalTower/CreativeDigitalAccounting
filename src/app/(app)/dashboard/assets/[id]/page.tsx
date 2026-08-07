import { requireFeature, getMyRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AssetDetail } from "@/components/app/AssetDetail";
import { AssetDocuments, type AssetDocDto } from "@/components/app/AssetDocuments";
import { assetDocCaps } from "@/lib/assetDocuments";
import { getT } from "@/lib/i18n/server";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, userId } = await requireFeature("assets");
  const { t, locale } = await getT();
  const { id } = await params;
  const a = await prisma.asset.findFirst({ where: { id, companyId }, include: { serviceLogs: { orderBy: { date: "desc" } } } });
  if (!a) notFound();

  const role = await getMyRole(userId, companyId);
  const caps = assetDocCaps(role);

  const [docsRaw, linkableRaw] = await Promise.all([
    caps.canView
      ? prisma.assetDocument.findMany({
          where: { assetId: id, deletedAt: null },
          select: {
            id: true, docType: true, name: true, description: true, docDate: true, number: true,
            issuer: true, validFrom: true, validTo: true, note: true, data: true,
            reminderDays: true, reminderSentAt: true, filename: true, originalFilename: true,
            mimeType: true, size: true, linkedDocumentId: true, uploadedById: true, createdAt: true, updatedAt: true,
            linkedDocument: { select: { id: true, number: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    // Документи на фирмата, които могат да се свържат (без дублиране на storage).
    prisma.document.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, number: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const docs: AssetDocDto[] = docsRaw.map((d) => ({
    ...d,
    docDate: d.docDate?.toISOString() ?? null,
    validFrom: d.validFrom?.toISOString() ?? null,
    validTo: d.validTo?.toISOString() ?? null,
    reminderSentAt: d.reminderSentAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    data: (d.data as Record<string, unknown> | null) ?? null,
  }));
  const linkable = linkableRaw.map((l) => ({ id: l.id, number: l.number, type: l.type as string }));

  return (
    <AssetDetail asset={{
      id: a.id, name: a.name, category: a.category, acquiredDate: a.acquiredDate.toISOString(),
      value: a.value, annualDepreciation: a.annualDepreciation, bookValue: a.bookValue,
      warrantyUntil: a.warrantyUntil?.toISOString() ?? null, insuranceUntil: a.insuranceUntil?.toISOString() ?? null,
      status: a.status, notes: a.notes,
    }}>
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("assets.detail.serviceLog.title", { n: a.serviceLogs.length })}</h3>
        {a.serviceLogs.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("assets.detail.serviceLog.empty")}</div> :
          a.serviceLogs.map((s) => (
            <div key={s.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.5)" }}>
              <strong>{new Date(s.date).toLocaleDateString(locale)}</strong> — {s.description}
            </div>
          ))}
      </div>
      {caps.canView && <AssetDocuments assetId={a.id} docs={docs} linkable={linkable} caps={caps} />}
    </AssetDetail>
  );
}
