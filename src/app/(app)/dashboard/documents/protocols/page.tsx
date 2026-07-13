import { requirePaidPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function ProtocolsPage() {
  const { companyId } = await requirePaidPlan();
  const { t, locale } = await getT();
  const protocols = await prisma.handoverProtocol.findMany({ where: { companyId }, orderBy: { date: "desc" } });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.prot.list.back")}</Link>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "0 0 3px" }}>{t("subdocs.prot.list.title")}</h1>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("subdocs.prot.list.count", { n: protocols.length })}</div>
          </div>
        </div>
        <Link href="/dashboard/documents/protocols/new" className="btn btn-primary">{t("subdocs.prot.list.newBtn")}</Link>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {protocols.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 12h6M9 15.5h6"/></svg></div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>{t("subdocs.prot.list.empty")}</div>
            <Link href="/dashboard/documents/protocols/new" className="btn btn-primary btn-sm">{t("subdocs.prot.list.create")}</Link>
          </div>
        ) : (
          <table>
            <thead><tr><th>{t("subdocs.prot.list.th.number")}</th><th>{t("subdocs.prot.list.th.date")}</th><th>{t("subdocs.prot.list.th.receiver")}</th><th>{t("subdocs.prot.list.th.subject")}</th><th></th></tr></thead>
            <tbody>
              {protocols.map((p) => (
                <tr key={p.id}>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{p.number}</td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>{new Date(p.date).toLocaleDateString(locale)}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{p.counterpartyName ?? "—"}</td>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.items ?? p.description ?? "—"}</td>
                  <td><Link href={`/dashboard/documents/protocols/${p.id}`} className="btn btn-ghost btn-sm">{t("subdocs.prot.list.view")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
