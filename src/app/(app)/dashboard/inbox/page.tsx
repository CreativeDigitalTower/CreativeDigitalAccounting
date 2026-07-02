import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";

export const dynamic = "force-dynamic";

const DOC_LABEL: Record<string, string> = { invoice: "Фактура", proforma: "Проформа", quote: "Оферта", credit_note: "Кредитно известие", debit_note: "Дебитно известие" };

export default async function InboxPage() {
  const { companyId } = await requireCompany();

  const [docs, notifications] = await Promise.all([
    prisma.document.findMany({
      where: { recipientCompanyId: companyId },
      include: { company: { select: { name: true } }, lines: { select: { lineTotal: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  // маркираме нотификациите като прочетени при отваряне на входящата кутия
  await prisma.notification.updateMany({ where: { companyId, read: false }, data: { read: true } });

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Входящи документи</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Документи, издадени към вашата фирма от други фирми в платформата</div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0", marginBottom: 20 }}>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "44px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13.5 5.5 5A2 2 0 0 1 7.4 3.5h9.2A2 2 0 0 1 18.5 5L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-5.5Z"/><path d="M3 13.5h5l1.5 2.5h5L16 13.5h5"/></svg></div>
            <div style={{ fontSize: 14 }}>Все още нямате входящи документи</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>От фирма</th><th>Документ</th><th>Дата</th><th className="num">Сума</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.company.name}</td>
                  <td>{DOC_LABEL[d.type] ?? d.type} № {d.number}</td>
                  <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(d.issueDate).toLocaleDateString("bg-BG")}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(d.lines.reduce((s, l) => s + l.lineTotal, 0), d.currency)}</td>
                  <td><Link href={`/dashboard/inbox/${d.id}`} className="btn btn-ghost btn-sm">Преглед</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>Известия</h2>
          <div className="glass panel" style={{ padding: "6px 0" }}>
            {notifications.map((n) => (
              <Link key={n.id} href={n.link ?? "/dashboard/inbox"} style={{ display: "block", padding: "10px 16px", borderBottom: "1px solid rgba(217,215,200,.4)", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString("bg-BG")}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
