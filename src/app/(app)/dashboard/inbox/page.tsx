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
            <div style={{ fontSize: 30, marginBottom: 10 }}>📥</div>
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
