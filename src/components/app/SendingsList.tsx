"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

export type SendingRow = {
  id: string; number: string; type: string; clientName: string | null; recipient: string | null;
  sentAt: string | null; lastType: string | null; lastAt: string | null;
  status: string; read: boolean; downloaded: boolean; paid: boolean; canRemind: boolean;
};

const STATUS_TONE: Record<string, string> = {
  paid: "var(--emerald)", overdue: "var(--brick)", bounced: "var(--brick)", failed: "var(--brick)",
  downloaded: "var(--emerald-dark)", viewed: "var(--emerald-dark)", opened: "var(--navy)",
  delivered: "var(--navy)", sent: "var(--muted)", awaiting_payment: "var(--brass)",
};

export function SendingsList({ rows }: { rows: SendingRow[] }) {
  const t = useT();
  const { locale } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  async function remind(id: string) {
    setBusy(id);
    const res = await fetch(`/api/documents/${id}/remind`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(null);
    if (res.ok) setDone((s) => new Set(s).add(id));
  }
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const yn = (b: boolean) => b ? t("tracking.sendings.yes") : t("tracking.sendings.no");

  if (rows.length === 0) return <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>{t("tracking.sendings.empty")}</div>;

  return (
    <div className="glass panel" style={{ padding: "8px 0" }}>
      <table>
        <thead>
          <tr>
            <th>{t("tracking.sendings.colDocument")}</th><th>{t("tracking.sendings.colRecipient")}</th>
            <th>{t("tracking.sendings.colDate")}</th><th>{t("tracking.sendings.colLast")}</th>
            <th>{t("tracking.sendings.colStatus")}</th><th>{t("tracking.sendings.colRead")}</th>
            <th>{t("tracking.sendings.colDownloaded")}</th><th>{t("tracking.sendings.colPaid")}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}><Link href={`/dashboard/documents/${r.id}`} style={{ color: "inherit", textDecoration: "none" }}>{r.number}</Link> <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t(`documents.types.${r.type}`)}</span></td>
              <td style={{ fontSize: 12.5 }}>{r.recipient ?? r.clientName ?? "—"}</td>
              <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmt(r.sentAt)}</td>
              <td style={{ fontSize: 12.5 }}>{r.lastType ? `${t(`tracking.event.${r.lastType}`)} · ${fmt(r.lastAt)}` : "—"}</td>
              <td><span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_TONE[r.status] ?? "var(--muted)", borderRadius: 14, padding: "2px 9px" }}>{t(`tracking.status.${r.status}`)}</span></td>
              <td style={{ fontSize: 12.5 }}>{yn(r.read)}</td>
              <td style={{ fontSize: 12.5 }}>{yn(r.downloaded)}</td>
              <td style={{ fontSize: 12.5 }}>{yn(r.paid)}</td>
              <td>
                {r.canRemind && !r.paid && (done.has(r.id)
                  ? <span style={{ fontSize: 11.5, color: "var(--emerald-dark)", fontWeight: 600 }}>✓</span>
                  : <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => remind(r.id)}>{busy === r.id ? "…" : t("tracking.cta.resend")}</button>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
