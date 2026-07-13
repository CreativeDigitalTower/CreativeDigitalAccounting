import Link from "next/link";
import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saftMissingFields } from "@/lib/saft/generate";
import { SaftPanel } from "@/components/app/SaftPanel";
import { getT, getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function SaftPage() {
  const { companyId } = await requireFeature("saft");
  const { t } = await getT();
  const saftMsg = (getMessages(await getLocale()).modules as { saft: { obligations: { title: string; text: string }[]; content: string[] } }).saft;
  const OBLIGATIONS = saftMsg.obligations;
  const CONTENT = saftMsg.content;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, eik: true, address: true, city: true, mol: true, vatRegistered: true, vatNumber: true },
  });
  const missing = company ? saftMissingFields(company) : [t("modules.saft.missingCompany")];
  const ready = missing.length === 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("modules.saft.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("modules.saft.subtitle")}</div>
      </div>

      {/* Готовност на данните */}
      <div className="glass panel" style={{ padding: "16px 20px", marginBottom: 18, borderLeft: `4px solid ${ready ? "var(--emerald)" : "var(--brass)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: ready ? "var(--emerald-dark)" : "var(--brass)" }}>
            {ready ? t("modules.saft.readyYes") : t("modules.saft.readyNo")}
          </span>
          {!ready && <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t("modules.saft.missing", { fields: missing.join(", ") })}</span>}
          <Link href="/dashboard/settings" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>{t("modules.saft.companyProfile")}</Link>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <SaftPanel ready={ready} />
      </div>

      {/* Съдържание на файла */}
      <div className="glass panel" style={{ padding: "18px 22px", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>{t("modules.saft.contentTitle")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>
          {CONTENT.map((c) => (
            <div key={c} style={{ paddingLeft: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{c}</div>
          ))}
        </div>
      </div>

      {/* Изисквания и задължения */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
        {OBLIGATIONS.map((o) => (
          <div key={o.title} className="glass panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{o.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{o.text}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 780 }}>
        {t("modules.saft.disclaimer")}
      </p>
    </>
  );
}
