import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InboxDocuments, type InboxDoc } from "@/components/app/InboxDocuments";
import { getT } from "@/lib/i18n/server";
import { renderNotif } from "@/lib/i18n/notif";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { companyId } = await requireCompany();
  const { t, locale } = await getT();

  const [docs, notifications] = await Promise.all([
    prisma.document.findMany({
      where: { recipientCompanyId: companyId },
      include: { company: { select: { name: true } }, lines: { select: { lineTotal: true } } },
      orderBy: { issueDate: "desc" },
    }),
    prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  // маркираме нотификациите като прочетени при отваряне на входящата кутия
  await prisma.notification.updateMany({ where: { companyId, read: false }, data: { read: true } });

  const inboxDocs: InboxDoc[] = docs.map((d) => ({
    id: d.id, type: d.type, number: d.number, issueDate: d.issueDate.toISOString(),
    fromName: d.company.name, total: d.lines.reduce((s, l) => s + l.lineTotal, 0), currency: d.currency,
  }));

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Входящи документи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Документи, издадени към вашата фирма от други фирми в платформата — подредени по месеци. Може да ги преглеждате и изтегляте поединично или групово.</div>
      </div>

      <InboxDocuments docs={inboxDocs} />

      {notifications.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>{t("notifications.topbar.title")}</h2>
          <div className="glass panel" style={{ padding: "6px 0" }}>
            {notifications.map((n) => {
              const { title, body } = renderNotif(t, n);
              return (
              <Link key={n.id} href={n.link ?? "/dashboard/inbox"} style={{ display: "block", padding: "10px 16px", borderBottom: "1px solid rgba(217,215,200,.4)", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
                {body && <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{body}</div>}
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString(locale)}</div>
              </Link>
            );})}
          </div>
        </>
      )}
    </>
  );
}
