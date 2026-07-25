import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { DOC_ORDER } from "@/lib/documentSort";
import { deriveTrackingStatus } from "@/lib/documentTracking";
import { computeSendingAnalytics, computeClientRankings, formatDuration } from "@/lib/trackingAnalytics";
import { SendingsList, type SendingRow } from "@/components/app/SendingsList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SendingsPage() {
  const { companyId } = await requireCompany();
  const { t } = await getT();

  const docs = await prisma.document.findMany({
    where: { companyId, OR: [{ sentToClientAt: { not: null } }, { events: { some: {} } }] },
    include: {
      client: { select: { id: true, name: true, contactEmail: true } },
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
  const rankings = computeClientRankings(docs.map((d) => ({ clientId: d.client?.id ?? null, clientName: d.client?.name ?? null, events: d.events, status: d.status, dueDate: d.dueDate })));
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

      {(rankings.fastestPaying.length > 0 || rankings.neverOpen.length > 0 || rankings.mostOverdue.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 20 }}>
          <RankCard title={t("tracking.analytics.fastestPaying")} color="var(--emerald-dark)"
            items={rankings.fastestPaying.map((c) => ({ id: c.clientId, name: c.name, meta: formatDuration(c.avgPayMs, durLabels) }))} empty={t("tracking.analytics.noData")} />
          <RankCard title={t("tracking.analytics.neverOpen")} color="var(--brass)"
            items={rankings.neverOpen.map((c) => ({ id: c.clientId, name: c.name, meta: t("tracking.analytics.docsN", { n: c.sentCount }) }))} empty={t("tracking.analytics.noData")} />
          <RankCard title={t("tracking.analytics.mostOverdue")} color="var(--brick)"
            items={rankings.mostOverdue.map((c) => ({ id: c.clientId, name: c.name, meta: t("tracking.analytics.overdueN", { n: c.overdueCount }) }))} empty={t("tracking.analytics.noData")} />
        </div>
      )}

      <SendingsList rows={rows} />
    </>
  );
}

function RankCard({ title, color, items, empty }: { title: string; color: string; items: { id: string; name: string; meta: string }[]; empty: string }) {
  return (
    <div className="glass panel" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((it) => (
            <Link key={it.id} href={`/dashboard/clients/${it.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, textDecoration: "none", color: "inherit" }}>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
              <span className="num" style={{ color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{it.meta}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
