import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DownloadButtons } from "@/components/app/DownloadButtons";
import { PLATFORM_CREDIT } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

const SECTION_KEYS = ["purpose","classification","ingredients","rawMaterials","packaging","preparation","process","organoleptic","physicochemical","microbiological","samplingMethods","labeling","productionControl","notes"];

export default async function TdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("haccp");
  const { t } = await getT();
  const { id } = await params;
  const [d, company] = await Promise.all([
    prisma.technologicalDoc.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!d) notFound();
  const doc = d as unknown as Record<string, string | null>;

  const bake = [d.bakingTemp && `${t("haccp.doc.tempLabel")} ${d.bakingTemp}`, d.bakingTime && `${t("haccp.doc.timeLabel")} ${d.bakingTime}`, d.cooling && `${t("haccp.doc.coolingLabel")} ${d.cooling}`].filter(Boolean).join(" · ");
  const store = [d.storage && `${t("haccp.doc.tempLabel")} ${d.storage}`, d.shelfLife && `${t("haccp.doc.shelfLabel")} ${d.shelfLife}`, d.storageConditions, d.transport && `${t("haccp.doc.transportLabel")} ${d.transport}`].filter(Boolean).join(" · ");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }} className="no-print">
        <Link href="/dashboard/haccp" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("haccp.doc.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{t("haccp.doc.tdPrefix")} {d.productName}</h1>
        <div style={{ marginLeft: "auto" }}><DownloadButtons filename={`${t("haccp.doc.tdPrefix").replace(" —","")}-${d.productName}`} /></div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 820, padding: "40px 48px", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--ink)", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{company?.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{[company?.address, company?.city].filter(Boolean).join(", ")}{company?.eik ? ` · ${t("haccp.doc.eikPrefix")} ${company.eik}` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontWeight: 700 }}>{d.docNumber ?? ""}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("haccp.doc.approve")}</div>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Fraunces', serif", textAlign: "center", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>{t("haccp.doc.title")}</h2>
        <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, marginBottom: 18 }}>{t("haccp.doc.productLabel")} {d.productName}</div>

        {bake && <div style={{ marginBottom: 12, fontSize: 12.5 }}><strong>{t("haccp.doc.heatTitle")}</strong> {bake}</div>}

        {SECTION_KEYS.filter((k) => doc[k]).map((k) => (
          <div key={k} style={{ marginBottom: 14, breakInside: "avoid" }}>
            <div style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700, letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>{t(`haccp.s.${k}`)}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{doc[k]}</div>
          </div>
        ))}

        {store && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 700, letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>{t("haccp.doc.storeTitle")}</div>
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
