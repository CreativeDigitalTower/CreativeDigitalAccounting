"use client";

import { useI18n, useT } from "@/components/i18n/I18nProvider";
import { TrackIcon } from "@/components/app/TrackIcon";
import { PaymentReminderModal } from "@/components/app/PaymentReminderModal";

export type TimelineEvent = { type: string; at: string; channel?: string | null; recipient?: string | null; device?: string | null };

const STATUS_TONE: Record<string, string> = {
  paid: "var(--emerald)", overdue: "var(--brick)", bounced: "var(--brick)", failed: "var(--brick)",
  downloaded: "var(--emerald-dark)", viewed: "var(--emerald-dark)", opened: "var(--navy)",
  delivered: "var(--navy)", sent: "var(--muted)", awaiting_payment: "var(--brass)", not_sent: "var(--muted)",
};

export function DocumentTimeline({
  documentId, events, status, suggestion, canRemind,
}: {
  documentId: string; events: TimelineEvent[]; status: string;
  suggestion?: { key: string; n?: number } | null; canRemind: boolean;
}) {
  const t = useT();
  const { locale } = useI18n();

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const ordered = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="glass panel" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: 0 }}>{t("tracking.timeline.title")}</h3>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: STATUS_TONE[status] ?? "var(--muted)", borderRadius: 20, padding: "3px 11px" }}>
          {t(`tracking.status.${status}`)}
        </span>
      </div>

      {suggestion && (
        <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1 }}>{t(`tracking.insight.${suggestion.key}`, suggestion.n != null ? { n: suggestion.n } : undefined)}</span>
          {canRemind && <PaymentReminderModal documentId={documentId} variant="primary" />}
        </div>
      )}

      {ordered.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>{t("tracking.timeline.empty")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ordered.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ lineHeight: "22px", color: "var(--ink-soft)", display: "inline-flex" }}><TrackIcon name={e.type} size={15} /></span>
                {i < ordered.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 18, background: "var(--border)" }} />}
              </div>
              <div style={{ paddingBottom: 14, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t(`tracking.event.${e.type}`)}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {fmt(e.at)}{e.recipient ? ` · ${e.recipient}` : ""}{e.device ? ` · ${e.device}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canRemind && !suggestion && (
        <div style={{ marginTop: 6 }}>
          <PaymentReminderModal documentId={documentId} variant="ghost" />
        </div>
      )}
    </div>
  );
}
