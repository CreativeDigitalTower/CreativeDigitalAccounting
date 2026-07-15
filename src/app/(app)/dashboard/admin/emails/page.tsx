import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SmtpStatusPanel } from "@/components/app/SmtpStatusPanel";
import { AdminEmailBroadcast } from "@/components/app/AdminEmailBroadcast";
import { companyEmailsEnabled } from "@/lib/email/prefs";
import { getT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  sent: "var(--emerald-dark)", queued: "var(--brass)", failed: "var(--brick)", skipped: "var(--muted)",
};

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
  const { t, locale } = await getT();
  const M = getMessages(locale).admin.emails as Record<string, Record<string, string>>;
  const CAT_LABEL = M.cat as Record<string, string>;
  const STATUS_LABEL = M.status as Record<string, string>;
  const sp = await searchParams;

  const where = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.cat ? { category: sp.cat } : {}),
  };

  const companiesRaw = await prisma.company.findMany({
    select: { id: true, name: true, emailPrefs: true, companyUsers: { where: { role: "owner" }, select: { user: { select: { email: true } } } } },
    orderBy: { name: "asc" },
  });
  const companies = companiesRaw.map((c) => ({
    id: c.id, name: c.name, ownerEmail: c.companyUsers[0]?.user.email ?? null, enabled: companyEmailsEnabled(c.emailPrefs),
  }));

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

  const joinedFromInvoice = await prisma.company.count({ where: { referralSource: "invoice_portal" } });

  const deliveryRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 100;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("admin.backToAdmin")}</Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "4px 0 0" }}>{t("admin.emails.title")}</h1>
        </div>
      </div>

      {/* SMTP статус + тестов имейл */}
      <SmtpStatusPanel />

      {/* Масов имейл до фирмите + абониране/отписване */}
      <AdminEmailBroadcast companies={companies} />

      {/* Статистики */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label={t("admin.emails.statSent")} value={String(sent)} sub={t("admin.emails.statSentSub", { n: total })} color="var(--emerald-dark)" />
        <Stat label={t("admin.emails.statOpened")} value={`${openRate}%`} sub={t("admin.emails.statOpenedSub", { n: opened })} />
        <Stat label={t("admin.emails.statClickRate")} value={`${clickRate}%`} sub={t("admin.emails.statClickSub", { n: clicked })} />
        <Stat label={t("admin.emails.statDeliveryRate")} value={`${deliveryRate}%`} color="var(--emerald-dark)" />
        <Stat label={t("admin.emails.statBounce")} value={String(bounced)} color={bounced ? "var(--brick)" : undefined} />
        <Stat label={t("admin.emails.statUnsubscribe")} value={String(unsub)} />
        <Stat label={t("admin.emails.statFailed")} value={String(failed)} color={failed ? "var(--brick)" : undefined} />
        <Stat label={t("admin.emails.statJoined")} value={String(joinedFromInvoice)} sub={t("admin.emails.statJoinedSub")} color="var(--navy)" />
      </div>

      {/* Филтри */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/admin/emails" className={`filter-tab${!sp.status && !sp.cat ? " active" : ""}`}>{t("admin.emails.all")}</Link>
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
          <thead><tr><th>{t("admin.emails.thRecipient")}</th><th>{t("admin.emails.thSubject")}</th><th>{t("admin.emails.thCategory")}</th><th>{t("admin.emails.thStatus")}</th><th className="num">{t("admin.emails.thOpens")}</th><th>{t("admin.emails.thDate")}</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>{t("admin.emails.noEmails")}</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: 12.5 }}>{l.toName ? `${l.toName} · ` : ""}{l.toEmail}</td>
                <td style={{ fontSize: 12.5 }}>{l.subject}</td>
                <td style={{ fontSize: 12 }}>{CAT_LABEL[l.category] ?? l.category}</td>
                <td><span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[l.status] }}>{STATUS_LABEL[l.status] ?? l.status}{l.bounced ? " " : ""}</span>
                  {l.status === "failed" && l.error && <div style={{ fontSize: 10.5, color: "var(--muted)" }} title={l.error}>{l.error.slice(0, 40)}</div>}</td>
                <td className="num" style={{ fontSize: 12 }}>{l.opensCount > 0 ? `${l.opensCount}×` : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Blacklist */}
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>{t("admin.emails.blacklist", { n: blacklist.length })}</h2>
      <div className="glass panel" style={{ padding: "8px 0" }}>
        <table>
          <thead><tr><th>{t("admin.emails.blEmail")}</th><th>{t("admin.emails.blReason")}</th><th className="num">{t("admin.emails.blErrors")}</th><th>{t("admin.emails.blUnsub")}</th><th>{t("admin.emails.blDate")}</th></tr></thead>
          <tbody>
            {blacklist.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>{t("admin.emails.blEmpty")}</td></tr>}
            {blacklist.map((b) => (
              <tr key={b.id}>
                <td style={{ fontSize: 12.5 }}>{b.email}</td>
                <td style={{ fontSize: 12 }}>{b.reason ?? "—"}</td>
                <td className="num">{b.bounces}</td>
                <td>{b.unsubscribed ? t("admin.emails.blYes") : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(b.createdAt).toLocaleDateString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>
        {t("admin.emails.note", { cron: "/api/cron/email-reminders" })}
      </p>
    </>
  );
}
