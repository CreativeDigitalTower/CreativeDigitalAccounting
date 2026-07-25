import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────
// Document Tracking — записване и извличане на събития по жизнения цикъл на
// изпратен документ. GDPR: пазим само хеширан IP + груб UA, без излишни данни.
// ─────────────────────────────────────────────────────────────────────────

export type DocEventType =
  | "sent" | "smtp_accepted" | "delivered" | "email_opened" | "viewed"
  | "downloaded" | "printed" | "link_visited" | "paid" | "overdue"
  | "bounced" | "failed" | "invalid_email" | "reminder_sent";

/** Подредба на събитията по прогрес (за прогрес-индикатора). */
export const EVENT_ORDER: DocEventType[] = [
  "sent", "smtp_accepted", "delivered", "email_opened", "viewed", "downloaded", "printed", "paid",
];

/** Маскира имейл за съхранение/показване (GDPR): john@doe.com → j***@doe.com */
export function maskEmail(email?: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
}

/** Хешира IP с дневна сол (GDPR: необратимо, не суров IP). */
export function hashIp(ip?: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.TRACKING_SALT || "cda-tracking";
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${ip}|${day}|${salt}`).digest("hex").slice(0, 16);
}

/** Груб User-Agent → „Chrome · Windows" (без версии/детайли). */
export function coarseDevice(ua?: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg/i.test(ua) ? "Edge" : /OPR|Opera/i.test(ua) ? "Opera" : /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : "—";
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "—";
  return `${browser} · ${os}`;
}

/** Извлича клиентския IP от заглавия (proxy-aware). */
export function clientIp(headers: Headers): string | null {
  return (headers.get("x-forwarded-for")?.split(",")[0].trim()) || headers.get("x-real-ip") || null;
}

/** Записва събитие (best-effort — не хвърля). За повтарящи се събития (opened/viewed)
 *  подаваме `once: true`, за да не дублираме, ако вече има такова за документа. */
export async function recordDocumentEvent(
  documentId: string,
  type: DocEventType,
  opts: { companyId?: string; channel?: string; recipient?: string | null; meta?: Record<string, unknown>; ipHash?: string | null; device?: string | null; once?: boolean } = {}
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    let companyId = opts.companyId;
    if (!companyId) {
      const d = await prisma.document.findUnique({ where: { id: documentId }, select: { companyId: true } });
      if (!d) return;
      companyId = d.companyId;
    }
    if (opts.once) {
      const existing = await prisma.documentEvent.findFirst({ where: { documentId, type } });
      if (existing) return;
    }
    await prisma.documentEvent.create({
      data: {
        documentId, companyId, type,
        channel: opts.channel ?? null,
        recipient: opts.recipient ?? null,
        meta: (opts.meta as object) ?? undefined,
        ipHash: opts.ipHash ?? null,
        device: opts.device ?? null,
      },
    });
  } catch { /* tracking е best-effort — никога не бламира основния поток */ }
}

export type TrackedEvent = { type: string; at: Date | string; channel?: string | null; recipient?: string | null; device?: string | null; meta?: unknown };

/** Производен tracking статус от събитията + статуса на документа. */
export type TrackingStatus =
  | "not_sent" | "sent" | "delivered" | "opened" | "viewed" | "downloaded"
  | "awaiting_payment" | "paid" | "overdue" | "bounced" | "failed";

export function deriveTrackingStatus(
  events: { type: string }[],
  doc: { status?: string | null; sentToClientAt?: Date | string | null; dueDate?: Date | string | null }
): TrackingStatus {
  const has = (t: string) => events.some((e) => e.type === t);
  if (has("bounced") || has("invalid_email")) return "bounced";
  if (has("failed")) return "failed";
  if (doc.status === "paid" || has("paid")) return "paid";
  const sent = has("sent") || !!doc.sentToClientAt;
  if (!sent) return "not_sent";
  const overdue = doc.status === "overdue" || (doc.dueDate ? new Date(doc.dueDate).getTime() < Date.now() && doc.status !== "paid" : false);
  if (overdue) return "overdue";
  if (has("downloaded")) return "downloaded";
  if (has("viewed")) return "viewed";
  if (has("email_opened")) return "opened";
  if (has("delivered") || has("smtp_accepted")) return "delivered";
  return "sent";
}

/** Малки индикатори (icon + i18n ключ) за списъка с документи. */
export function statusChips(events: { type: string }[], doc: { status?: string | null; sentToClientAt?: Date | string | null }): { icon: string; key: string; tone: "good" | "ok" | "attention" | "muted" }[] {
  const has = (t: string) => events.some((e) => e.type === t);
  const chips: { icon: string; key: string; tone: "good" | "ok" | "attention" | "muted" }[] = [];
  if (has("sent") || doc.sentToClientAt) chips.push({ icon: "📨", key: "tracking.chip.sent", tone: "muted" });
  if (has("delivered") || has("smtp_accepted")) chips.push({ icon: "📬", key: "tracking.chip.delivered", tone: "muted" });
  if (has("email_opened") || has("viewed")) chips.push({ icon: "👁", key: "tracking.chip.opened", tone: "ok" });
  if (has("downloaded")) chips.push({ icon: "📄", key: "tracking.chip.downloaded", tone: "ok" });
  if (doc.status === "paid" || has("paid")) chips.push({ icon: "💰", key: "tracking.chip.paid", tone: "good" });
  if (has("bounced") || has("invalid_email") || has("failed")) chips.push({ icon: "❌", key: "tracking.chip.error", tone: "attention" });
  return chips;
}

/** Дни от последното изпращане без отваряне (за предложение „Изпрати отново"). */
export function daysSinceSentUnopened(events: TrackedEvent[]): number | null {
  const sent = events.filter((e) => e.type === "sent").map((e) => new Date(e.at).getTime()).sort((a, b) => b - a)[0];
  if (!sent) return null;
  const opened = events.some((e) => e.type === "email_opened" || e.type === "viewed");
  if (opened) return null;
  return Math.floor((Date.now() - sent) / 86400000);
}
