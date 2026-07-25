import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { DOC_ORDER } from "@/lib/documentSort";
import { deriveTrackingStatus } from "@/lib/documentTracking";
import { computeSendingAnalytics, formatDuration } from "@/lib/trackingAnalytics";
import { SendingsList, type SendingRow } from "@/components/app/SendingsList";

export const dynamic = "force-dynamic";

export default async function SendingsPage() {
  const { companyId } = await requireCompany();
  const { t } = await getT();

  const docs = await prisma.document.findMany({
    where: { companyId, OR: [{ sentToClientAt: { not: null } }, { events: { some: {} } }] },
    include: {
      client: { select: { name: true, contactEmail: true } },
      events: { orderBy: { at: "asc" }, select: { type: true, at: true, recipient: true } },
    },
    orderBy: DOC_ORDER,
  });

  const rows: SendingRow[] = docs.map((d) => {
    const has = (ty: string) => d.events.some((e) => e.type === ty);
    const last = d.events[d.events.length - 1] ?? null;
    const sentEv = d.events.find((e) => e.type === "sent");
    return {
      id: d.id, number: d.number, type: d.type, clientName: d.client?.name ?? null,
      recipient: sentEv?.recipient ?? null,
      sentAt: d.sentToClientAt?.toISOString() ?? sentEv?.at.toISOString() ?? null,
      lastType: last?.type ?? null, lastAt: last?.at.toISOString() ?? null,
      status: deriveTrackingStatus(d.events, d),
      read: has("email_opened") || has("viewed"),
      downloaded: has("downloaded"),
      paid: d.status === "paid" || has("paid"),
      canRemind: !!(d.clientEmail || d.client?.contactEmail),
    };
  });

  const an = computeSendingAnalytics(docs.map((d) => ({ events: d.events, status: d.status })));
  const durLabels = { hours: (n: number) => t("tracking.client.hours", { n }), days: (n: number) => t("tracking.client.days", { n }), na: t("tracking.client.na") };
  const stats = [
    { label: t("tracking.analytics.sent"), value: String(an.sent), color: "var(--navy)" },
    { label: t("tracking.analytics.opened"), value: String(an.opened), color: "var(--emerald-dark)" },
    { label: t("tracking.analytics.unopened"), value: String(an.unopened), color: "var(--brass)" },
    { label: t("tracking.analytics.avgOpen"), value: formatDuration(an.avgOpenMs, durLabels), color: "var(--ink)" },
    { label: t("tracking.analytics.avgPay"), value: formatDuration(an.avgPayMs, durLabels), color: "var(--ink)" },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("tracking.sendings.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("tracking.sendings.subtitle")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        {stats.map((s) => (
          <div key={s.label} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{s.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <SendingsList rows={rows} />
    </>
  );
}
