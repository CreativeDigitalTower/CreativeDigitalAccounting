import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = {
  account: "Акаунт", subscription: "Абонамент", document: "Документ", reminder: "Напомняне",
  admin: "Админ", system: "Система", client_decision: "Решение", product: "Продукт",
};
const STATUS_COLOR: Record<string, string> = {
  sent: "var(--emerald-dark)", queued: "var(--brass)", failed: "var(--brick)", skipped: "var(--muted)",
};
const STATUS_LABEL: Record<string, string> = { sent: "Изпратен", queued: "В опашка", failed: "Неуспешен", skipped: "Пропуснат" };

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass panel" style={{ padding: "14px 18px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--navy)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<{ status?: string; cat?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const where = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.cat ? { category: sp.cat } : {}),
  };

  const [logs, total, sent, opened, clicked, failed, bounced, unsub, blacklist] = await Promise.all([
    prisma.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "sent" } }),
    prisma.emailLog.count({ where: { opensCount: { gt: 0 } } }),
    prisma.emailLog.count({ where: { clicksCount: { gt: 0 } } }),
    prisma.emailLog.count({ where: { status: "failed" } }),
    prisma.emailLog.count({ where: { bounced: true } }),
    prisma.emailBlacklist.count({ where: { unsubscribed: true } }),
    prisma.emailBlacklist.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const deliveryRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 100;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Супер Админ</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 0" }}>Имейли & Notification Center</h1>
        </div>
      </div>

      {/* Статистики */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Изпратени" value={String(sent)} sub={`от ${total} общо`} color="var(--emerald-dark)" />
        <Stat label="Отворени" value={`${openRate}%`} sub={`${opened} имейла`} />
        <Stat label="Click rate" value={`${clickRate}%`} sub={`${clicked} клика`} />
        <Stat label="Delivery rate" value={`${deliveryRate}%`} color="var(--emerald-dark)" />
        <Stat label="Bounce" value={String(bounced)} color={bounced ? "var(--brick)" : undefined} />
        <Stat label="Unsubscribe" value={String(unsub)} />
        <Stat label="Неуспешни" value={String(failed)} color={failed ? "var(--brick)" : undefined} />
      </div>

      {/* Филтри */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin/emails" className={`filter-tab${!sp.status && !sp.cat ? " active" : ""}`}>Всички</Link>
        {["sent", "queued", "failed", "skipped"].map((s) => (
          <Link key={s} href={`/dashboard/admin/emails?status=${s}`} className={`filter-tab${sp.status === s ? " active" : ""}`}>{STATUS_LABEL[s]}</Link>
        ))}
        <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
        {["account", "subscription", "document", "reminder", "admin", "client_decision"].map((c) => (
          <Link key={c} href={`/dashboard/admin/emails?cat=${c}`} className={`filter-tab${sp.cat === c ? " active" : ""}`}>{CAT_LABEL[c]}</Link>
        ))}
      </div>

      {/* Лог */}
      <div className="glass panel" style={{ padding: "8px 0", marginBottom: 20 }}>
        <table>
          <thead><tr><th>Получател</th><th>Тема</th><th>Категория</th><th>Статус</th><th className="num">Отв.</th><th>Дата</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>Няма имейли</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: 12.5 }}>{l.toName ? `${l.toName} · ` : ""}{l.toEmail}</td>
                <td style={{ fontSize: 12.5 }}>{l.subject}</td>
                <td style={{ fontSize: 12 }}>{CAT_LABEL[l.category] ?? l.category}</td>
                <td><span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status] ?? l.status}{l.bounced ? " ⚠" : ""}</span>
                  {l.status === "failed" && l.error && <div style={{ fontSize: 10.5, color: "var(--muted)" }} title={l.error}>{l.error.slice(0, 40)}</div>}</td>
                <td className="num" style={{ fontSize: 12 }}>{l.opensCount > 0 ? `${l.opensCount}×` : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString("bg-BG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Blacklist */}
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>Blacklist ({blacklist.length})</h2>
      <div className="glass panel" style={{ padding: "8px 0" }}>
        <table>
          <thead><tr><th>Имейл</th><th>Причина</th><th className="num">Грешки</th><th>Отписан</th><th>Дата</th></tr></thead>
          <tbody>
            {blacklist.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>Празен — няма проблемни адреси</td></tr>}
            {blacklist.map((b) => (
              <tr key={b.id}>
                <td style={{ fontSize: 12.5 }}>{b.email}</td>
                <td style={{ fontSize: 12 }}>{b.reason ?? "—"}</td>
                <td className="num">{b.bounces}</td>
                <td>{b.unsubscribed ? "Да" : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(b.createdAt).toLocaleDateString("bg-BG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
        Retry при SMTP грешка: 5 мин → 30 мин → 2 ч → 24 ч. След изчерпване адресът се добавя в Blacklist.
        Опашката и напомнянията се обработват от <code>/api/cron/email-reminders</code> (дневен cron).
      </p>
    </>
  );
}
