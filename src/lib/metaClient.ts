import { isCustomEvent } from "@/lib/metaEvents";

/**
 * Централен браузър helper за Meta Pixel + сървърно копие (CAPI) с общ event_id (dedup).
 * ВСИЧКИ клиентски Meta събития минават през metaTrack().
 */

type FbqUser = { email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null; externalId?: string | null };

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

function uuid(): string {
  try { return crypto.randomUUID(); } catch { return "e-" + Math.random().toString(36).slice(2) + Date.now(); }
}

export function metaTrack(
  eventName: string,
  custom?: Record<string, unknown>,
  options?: { eventId?: string; user?: FbqUser },
): string {
  const eventId = options?.eventId ?? uuid();

  // 1) Браузър Pixel (с eventID за дедупликация)
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    const verb = isCustomEvent(eventName) ? "trackCustom" : "track";
    window.fbq(verb, eventName, custom ?? {}, { eventID: eventId });
  }

  // 2) Сървърно копие през CAPI (същия event_id → Meta дедупликира)
  if (typeof window !== "undefined") {
    try {
      fetch("/api/tracking/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, eventId, custom, user: options?.user, eventSourceUrl: window.location.href }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  }
  return eventId;
}
